import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toxiproxyRequest } from "../utils/toxiproxy-api.js";

export function registerToxicManagementTools(server: McpServer) {
  // Add latency toxic
  server.registerTool("add_latency_toxic", {
    title: "Add Latency Toxic",
    description: "Add a latency toxic to simulate network delays",
    inputSchema: {
      proxyName: z.string().describe("Name of the proxy to add the toxic to"),
      toxicName: z.string().optional().describe("Name for the toxic (defaults to 'latency_toxic')"),
      latency: z.number().describe("Latency in milliseconds"),
      jitter: z.number().optional().describe("Jitter in milliseconds (defaults to 0)"),
      toxicity: z.number().min(0).max(1).optional().describe("Probability of applying toxic (0.0 to 1.0, defaults to 1.0)"),
      direction: z.enum(["upstream", "downstream"]).optional().describe("Direction to apply toxic (defaults to 'downstream')")
    }
  }, async ({ proxyName, toxicName, latency, jitter, toxicity, direction }) => {
    const actualToxicName = toxicName || "latency_toxic";
    const actualJitter = jitter || 0;
    const actualToxicity = toxicity || 1.0;
    const actualDirection = direction || "downstream";
    
    try {
      const toxic = await toxiproxyRequest(`/proxies/${proxyName}/toxics`, {
        method: "POST",
        body: JSON.stringify({
          name: actualToxicName,
          type: "latency",
          stream: actualDirection,
          toxicity: actualToxicity,
          attributes: {
            latency: latency,
            jitter: actualJitter
          }
        })
      });
      
      return {
        content: [{
          type: "text",
          text: `✅ Latency toxic added successfully!\n\n**Toxic Details:**\n- Name: ${actualToxicName}\n- Proxy: ${proxyName}\n- Type: latency\n- Direction: ${actualDirection}\n- Latency: ${latency}ms\n- Jitter: ${actualJitter}ms\n- Toxicity: ${actualToxicity * 100}%\n\nThe toxic is now active and will affect ${actualDirection} traffic.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to add latency toxic!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the proxy '${proxyName}' exists.`
        }]
      };
    }
  });

  // Add bandwidth toxic
  server.registerTool("add_bandwidth_toxic", {
    title: "Add Bandwidth Toxic",
    description: "Add a bandwidth limiting toxic to simulate slow connections",
    inputSchema: {
      proxyName: z.string().describe("Name of the proxy to add the toxic to"),
      toxicName: z.string().optional().describe("Name for the toxic (defaults to 'bandwidth_toxic')"),
      rate: z.number().describe("Bandwidth limit in KB/s"),
      toxicity: z.number().min(0).max(1).optional().describe("Probability of applying toxic (0.0 to 1.0, defaults to 1.0)"),
      direction: z.enum(["upstream", "downstream"]).optional().describe("Direction to apply toxic (defaults to 'downstream')")
    }
  }, async ({ proxyName, toxicName, rate, toxicity, direction }) => {
    const actualToxicName = toxicName || "bandwidth_toxic";
    const actualToxicity = toxicity || 1.0;
    const actualDirection = direction || "downstream";
    
    try {
      const toxic = await toxiproxyRequest(`/proxies/${proxyName}/toxics`, {
        method: "POST",
        body: JSON.stringify({
          name: actualToxicName,
          type: "bandwidth",
          stream: actualDirection,
          toxicity: actualToxicity,
          attributes: {
            rate: rate
          }
        })
      });
      
      return {
        content: [{
          type: "text",
          text: `✅ Bandwidth toxic added successfully!\n\n**Toxic Details:**\n- Name: ${actualToxicName}\n- Proxy: ${proxyName}\n- Type: bandwidth\n- Direction: ${actualDirection}\n- Rate limit: ${rate} KB/s\n- Toxicity: ${actualToxicity * 100}%\n\nThe toxic is now active and will limit ${actualDirection} bandwidth.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to add bandwidth toxic!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the proxy '${proxyName}' exists.`
        }]
      };
    }
  });

  // Add timeout toxic
  server.registerTool("add_timeout_toxic", {
    title: "Add Timeout Toxic",
    description: "Add a timeout toxic to simulate connection timeouts",
    inputSchema: {
      proxyName: z.string().describe("Name of the proxy to add the toxic to"),
      toxicName: z.string().optional().describe("Name for the toxic (defaults to 'timeout_toxic')"),
      timeout: z.number().describe("Timeout in milliseconds (0 means data is dropped until toxic is removed)"),
      toxicity: z.number().min(0).max(1).optional().describe("Probability of applying toxic (0.0 to 1.0, defaults to 1.0)"),
      direction: z.enum(["upstream", "downstream"]).optional().describe("Direction to apply toxic (defaults to 'downstream')")
    }
  }, async ({ proxyName, toxicName, timeout, toxicity, direction }) => {
    const actualToxicName = toxicName || "timeout_toxic";
    const actualToxicity = toxicity || 1.0;
    const actualDirection = direction || "downstream";
    
    try {
      const toxic = await toxiproxyRequest(`/proxies/${proxyName}/toxics`, {
        method: "POST",
        body: JSON.stringify({
          name: actualToxicName,
          type: "timeout",
          stream: actualDirection,
          toxicity: actualToxicity,
          attributes: {
            timeout: timeout
          }
        })
      });
      
      return {
        content: [{
          type: "text",
          text: `✅ Timeout toxic added successfully!\n\n**Toxic Details:**\n- Name: ${actualToxicName}\n- Proxy: ${proxyName}\n- Type: timeout\n- Direction: ${actualDirection}\n- Timeout: ${timeout}ms ${timeout === 0 ? '(data will be dropped until removed)' : ''}\n- Toxicity: ${actualToxicity * 100}%\n\nThe toxic is now active and will affect ${actualDirection} traffic.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to add timeout toxic!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the proxy '${proxyName}' exists.`
        }]
      };
    }
  });

  // Remove a toxic
  server.registerTool("remove_toxic", {
    title: "Remove Toxic",
    description: "Remove a specific toxic from a proxy",
    inputSchema: {
      proxyName: z.string().describe("Name of the proxy"),
      toxicName: z.string().describe("Name of the toxic to remove")
    }
  }, async ({ proxyName, toxicName }) => {
    try {
      await toxiproxyRequest(`/proxies/${proxyName}/toxics/${toxicName}`, {
        method: "DELETE"
      });
      
      return {
        content: [{
          type: "text",
          text: `✅ Toxic '${toxicName}' removed successfully from proxy '${proxyName}'!`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to remove toxic!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure both the proxy '${proxyName}' and toxic '${toxicName}' exist.`
        }]
      };
    }
  });

  // Reset all proxies (remove all toxics and enable all proxies)
  server.registerTool("reset_proxies", {
    title: "Reset All Proxies",
    description: "Remove all toxics from all proxies and enable them",
    inputSchema: {}
  }, async () => {
    try {
      await toxiproxyRequest("/reset", {
        method: "POST"
      });
      
      return {
        content: [{
          type: "text",
          text: `✅ All proxies have been reset!\n\n- All toxics removed\n- All proxies enabled\n- Network conditions are back to normal`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to reset proxies!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });
}