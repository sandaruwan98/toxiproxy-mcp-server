import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import tool registration functions
import { registerStatusTools } from "./tools/status.js";
import { registerProxyManagementTools } from "./tools/proxy-management.js";
import { registerToxicManagementTools } from "./tools/toxic-management.js";
import { registerTroubleshootingTools } from "./tools/troubleshooting.js";

// Create an MCP server
const server = new McpServer({
  name: "toxi-mcp-server",
  version: "1.0.0"
});

// Register all tool categories
registerStatusTools(server);
registerProxyManagementTools(server);
registerToxicManagementTools(server);
registerTroubleshootingTools(server);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

