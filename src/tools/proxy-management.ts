import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toxiproxyRequest } from "../utils/toxiproxy-api.js";

export function registerProxyManagementTools(server: McpServer) {
  // Create a database proxy
  server.registerTool("create_db_proxy", {
    title: "Create Database Proxy",
    description: "Create a Toxiproxy proxy for a PostgreSQL database with port forwarding setup. You must specify the database port.",
    inputSchema: {
      name: z.string().describe("Name for the proxy (e.g., 'postgres_proxy')"),
      dbPort: z.number().describe("Database port (the actual database port) - REQUIRED"),
      proxyPort: z.number().optional().describe("Proxy listen port (defaults to dbPort + 10000)"),
      upstream: z.string().optional().describe("Upstream address (defaults to 'dev.localhost:dbPort')")
    }
  }, async ({ name, dbPort, proxyPort, upstream }) => {
    const actualProxyPort = proxyPort || (dbPort + 10000);
    const actualUpstream = upstream || `dev.localhost:${dbPort}`;
    
    try {
      const proxy = await toxiproxyRequest("/proxies", {
        method: "POST",
        body: JSON.stringify({
          name: name,
          listen: `0.0.0.0:${actualProxyPort}`,
          upstream: actualUpstream,
          enabled: true
        })
      });
      
      const iptablesCommand = `sudo iptables -t nat -A PREROUTING -p tcp --dport ${dbPort} -j REDIRECT --to-port ${actualProxyPort}`;
      
      return {
        content: [{
          type: "text",
          text: `✅ Database proxy created successfully!\n\n**Proxy Details:**\n- Name: ${name}\n- Listen: 0.0.0.0:${actualProxyPort}\n- Upstream: ${actualUpstream}\n- Status: Enabled\n\n**Next Step - Port Forwarding:**\nRun this command to redirect traffic from port ${dbPort} to the proxy:\n\n\`\`\`bash\n${iptablesCommand}\n\`\`\`\n\n**To remove the rule later:**\n\`\`\`bash\nsudo iptables -t nat -D PREROUTING -p tcp --dport ${dbPort} -j REDIRECT --to-port ${actualProxyPort}\n\`\`\``
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to create database proxy!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  // Create a RabbitMQ proxy
  server.registerTool("create_rabbitmq_proxy", {
    title: "Create RabbitMQ Proxy",
    description: "Create a Toxiproxy proxy for RabbitMQ with port forwarding setup",
    inputSchema: {
      name: z.string().describe("Name for the proxy (e.g., 'rabbitmq_proxy')"),
      amqpPort: z.number().optional().describe("RabbitMQ AMQP port (defaults to 5672)"),
      proxyPort: z.number().optional().describe("Proxy listen port (defaults to amqpPort + 10000)"),
      upstream: z.string().optional().describe("Upstream address (defaults to 'dev.localhost:amqpPort')")
    }
  }, async ({ name, amqpPort, proxyPort, upstream }) => {
    const actualAmqpPort = amqpPort || 5672;
    const actualProxyPort = proxyPort || (actualAmqpPort + 10000);
    const actualUpstream = upstream || `dev.localhost:${actualAmqpPort}`;
    
    try {
      const proxy = await toxiproxyRequest("/proxies", {
        method: "POST",
        body: JSON.stringify({
          name: name,
          listen: `0.0.0.0:${actualProxyPort}`,
          upstream: actualUpstream,
          enabled: true
        })
      });
      
      const iptablesCommand = `sudo iptables -t nat -A PREROUTING -p tcp --dport ${actualAmqpPort} -j REDIRECT --to-port ${actualProxyPort}`;
      
      return {
        content: [{
          type: "text",
          text: `✅ RabbitMQ proxy created successfully!\n\n**Proxy Details:**\n- Name: ${name}\n- Listen: 0.0.0.0:${actualProxyPort}\n- Upstream: ${actualUpstream}\n- Status: Enabled\n\n**Next Step - Port Forwarding:**\nRun this command to redirect traffic from port ${actualAmqpPort} to the proxy:\n\n\`\`\`bash\n${iptablesCommand}\n\`\`\`\n\n**To remove the rule later:**\n\`\`\`bash\nsudo iptables -t nat -D PREROUTING -p tcp --dport ${actualAmqpPort} -j REDIRECT --to-port ${actualProxyPort}\n\`\`\``
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to create RabbitMQ proxy!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  // List all proxies
  server.registerTool("list_proxies", {
    title: "List Proxies",
    description: "List all Toxiproxy proxies and their toxics",
    inputSchema: {}
  }, async () => {
    try {
      const proxies = await toxiproxyRequest("/proxies");
      
      if (Object.keys(proxies).length === 0) {
        return {
          content: [{
            type: "text",
            text: "📭 No proxies found.\n\nUse 'create_db_proxy' to create your first proxy."
          }]
        };
      }
      
      let output = "📋 **Active Proxies:**\n\n";
      
      for (const [name, proxy] of Object.entries(proxies as Record<string, any>)) {
        const status = proxy.enabled ? "✅ Enabled" : "❌ Disabled";
        output += `**${name}**\n`;
        output += `- Listen: ${proxy.listen}\n`;
        output += `- Upstream: ${proxy.upstream}\n`;
        output += `- Status: ${status}\n`;
        
        if (proxy.toxics && proxy.toxics.length > 0) {
          output += `- Toxics:\n`;
          for (const toxic of proxy.toxics) {
            const attrs = Object.entries(toxic.attributes || {})
              .map(([k, v]) => `${k}=${v}`)
              .join(', ');
            output += `  - ${toxic.name} (${toxic.type}, ${toxic.stream}, ${toxic.toxicity * 100}%)`;
            if (attrs) output += ` - ${attrs}`;
            output += `\n`;
          }
        } else {
          output += `- Toxics: None\n`;
        }
        output += `\n`;
      }
      
      return {
        content: [{
          type: "text",
          text: output
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to list proxies!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  // Delete a proxy
  server.registerTool("delete_proxy", {
    title: "Delete Proxy",
    description: "Delete a Toxiproxy proxy entirely",
    inputSchema: {
      proxyName: z.string().describe("Name of the proxy to delete")
    }
  }, async ({ proxyName }) => {
    try {
      await toxiproxyRequest(`/proxies/${proxyName}`, {
        method: "DELETE"
      });
      
      return {
        content: [{
          type: "text",
          text: `✅ Proxy '${proxyName}' deleted successfully!\n\n⚠️  Remember to remove any iptables rules you created for this proxy.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to delete proxy!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the proxy '${proxyName}' exists.`
        }]
      };
    }
  });
}