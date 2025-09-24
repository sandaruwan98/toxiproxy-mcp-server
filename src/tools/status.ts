import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toxiproxyRequest, TOXIPROXY_URL } from "../utils/toxiproxy-api.js";

export function registerStatusTools(server: McpServer) {
  // Check Toxiproxy server status
  server.registerTool("check_toxiproxy_status", {
    title: "Check Toxiproxy Status",
    description: "Check if the Toxiproxy server is running and accessible",
    inputSchema: {}
  }, async () => {
    try {
      const version = await toxiproxyRequest("/version");
      const proxies = await toxiproxyRequest("/proxies");
      
      return {
        content: [{
          type: "text",
          text: `✅ Toxiproxy server is running!\n\nVersion: ${version}\nActive proxies: ${Object.keys(proxies).length}\n\nServer URL: ${TOXIPROXY_URL}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Toxiproxy server is not accessible!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTo start Toxiproxy server, run:\ndocker run --rm -it --network=host --add-host=dev.localhost:127.0.0.1 ghcr.io/shopify/toxiproxy:2.5.0 -host 0.0.0.0`
        }]
      };
    }
  });
}