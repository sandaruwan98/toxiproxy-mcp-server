import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toxiproxyRequest } from "../utils/toxiproxy-api.js";

export function registerTroubleshootingTools(server: McpServer) {
  // Troubleshooting tool - check system connectivity
  server.registerTool("troubleshoot_connectivity", {
    title: "Troubleshoot Connectivity",
    description: "Diagnose network connectivity issues between application, proxy, and upstream services",
    inputSchema: {
      proxyName: z.string().optional().describe("Name of the proxy to troubleshoot (optional)"),
      testUpstream: z.boolean().optional().describe("Test direct upstream connectivity (defaults to true)")
    }
  }, async ({ proxyName, testUpstream = true }) => {
    let diagnostics = "🔍 **Connectivity Diagnostics**\n\n";
    
    try {
      // Check Toxiproxy server
      diagnostics += "**1. Toxiproxy Server Status:**\n";
      try {
        const version = await toxiproxyRequest("/version");
        const proxies = await toxiproxyRequest("/proxies");
        diagnostics += `✅ Toxiproxy server is running (v${version})\n`;
        diagnostics += `✅ Found ${Object.keys(proxies).length} active proxies\n\n`;
      } catch (error) {
        diagnostics += `❌ Toxiproxy server issue: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
        diagnostics += "**Troubleshooting steps:**\n";
        diagnostics += "1. Start Toxiproxy: `docker run --rm -it --network=host --add-host=dev.localhost:127.0.0.1 ghcr.io/shopify/toxiproxy:2.5.0 -host 0.0.0.0`\n";
        diagnostics += "2. Check if port 8474 is available: `lsof -i :8474`\n";
        diagnostics += "3. Verify Docker is running: `docker ps`\n\n";
      }

      // Check specific proxy if provided
      if (proxyName) {
        diagnostics += "**2. Proxy-Specific Checks:**\n";
        try {
          const proxies = await toxiproxyRequest("/proxies");
          const proxy = proxies[proxyName];
          
          if (!proxy) {
            diagnostics += `❌ Proxy '${proxyName}' not found\n`;
            diagnostics += `Available proxies: ${Object.keys(proxies).join(', ') || 'none'}\n\n`;
          } else {
            diagnostics += `✅ Proxy '${proxyName}' exists\n`;
            diagnostics += `- Listen: ${proxy.listen}\n`;
            diagnostics += `- Upstream: ${proxy.upstream}\n`;
            diagnostics += `- Status: ${proxy.enabled ? 'Enabled' : 'Disabled'}\n`;
            diagnostics += `- Toxics: ${proxy.toxics?.length || 0}\n\n`;
            
            if (!proxy.enabled) {
              diagnostics += "⚠️  Proxy is disabled. Enable it to allow traffic.\n\n";
            }
          }
        } catch (error) {
          diagnostics += `❌ Error checking proxy: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
        }
      }

      // General troubleshooting commands
      diagnostics += "**3. Network Troubleshooting Commands:**\n";
      diagnostics += "```bash\n";
      diagnostics += "# Check if ports are listening\n";
      diagnostics += "netstat -tlnp | grep -E ':(8474|5432|5672)'\n\n";
      diagnostics += "# Check iptables rules\n";
      diagnostics += "sudo iptables -t nat -L PREROUTING --line-numbers\n\n";
      diagnostics += "# Test direct connection to Toxiproxy\n";
      diagnostics += "curl -v http://localhost:8474/version\n\n";
      diagnostics += "# Check Docker containers\n";
      diagnostics += "docker ps | grep toxiproxy\n";
      diagnostics += "```\n\n";

      diagnostics += "**4. Common Issues & Solutions:**\n";
      diagnostics += "- **Connection refused**: Toxiproxy not running → Start Docker container\n";
      diagnostics += "- **Proxy not intercepting**: Missing iptables rule → Run the generated iptables command\n";
      diagnostics += "- **Application can't connect**: Wrong proxy port → Check proxy listen address\n";
      diagnostics += "- **Upstream unreachable**: Service down → Verify upstream service is running\n";
      diagnostics += "- **Toxics not working**: Proxy disabled → Enable proxy or check toxic configuration\n\n";

      return {
        content: [{
          type: "text",
          text: diagnostics
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Troubleshooting failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  // Troubleshooting tool - check iptables rules
  server.registerTool("check_iptables_rules", {
    title: "Check iptables Rules",
    description: "Check current iptables NAT rules and provide cleanup commands",
    inputSchema: {}
  }, async () => {
    return {
      content: [{
        type: "text",
        text: `🔧 **iptables NAT Rules Management**\n\n**Check current rules:**\n\`\`\`bash\n# List all NAT PREROUTING rules with line numbers\nsudo iptables -t nat -L PREROUTING --line-numbers -v\n\n# Check for Toxiproxy-related rules\nsudo iptables -t nat -L PREROUTING | grep -E 'REDIRECT|dpt:'\n\`\`\`\n\n**Remove specific rule by line number:**\n\`\`\`bash\n# First, list rules with line numbers to find the one to remove\nsudo iptables -t nat -L PREROUTING --line-numbers\n\n# Then remove by line number (replace N with actual line number)\nsudo iptables -t nat -D PREROUTING N\n\`\`\`\n\n**Remove all REDIRECT rules (nuclear option):**\n\`\`\`bash\n# ⚠️  WARNING: This removes ALL redirect rules, not just Toxiproxy ones\nsudo iptables -t nat -F PREROUTING\n\`\`\`\n\n**Test if rules are working:**\n\`\`\`bash\n# Check if traffic is being redirected (replace 15234 with your DB port)\nss -tlnp | grep :15234  # Should show proxy port listening\nss -tlnp | grep :25234  # Should show your proxy listening\n\`\`\`\n\n**Common iptables Issues:**\n- **Rule not found**: Check the exact port numbers and syntax\n- **Permission denied**: Must use sudo for iptables commands\n- **Rules persist after reboot**: Add rules to /etc/iptables/rules.v4 or use iptables-persistent\n- **Docker conflicts**: Docker modifies iptables; restart Docker if issues persist`
      }]
    };
  });

  // Troubleshooting tool - generate test commands
  server.registerTool("generate_test_commands", {
    title: "Generate Test Commands",
    description: "Generate commands to test your proxy setup and diagnose issues",
    inputSchema: {
      proxyName: z.string().describe("Name of the proxy to test"),
      dbPort: z.number().optional().describe("Database port (for database connections)"),
      testType: z.enum(["database", "rabbitmq", "http"]).optional().describe("Type of service to test (defaults to 'database')")
    }
  }, async ({ proxyName, dbPort, testType = "database" }) => {
    try {
      const proxies = await toxiproxyRequest("/proxies");
      const proxy = proxies[proxyName];
      
      if (!proxy) {
        return {
          content: [{
            type: "text",
            text: `❌ Proxy '${proxyName}' not found!\n\nAvailable proxies: ${Object.keys(proxies).join(', ') || 'none'}\n\nUse 'list_proxies' to see all active proxies.`
          }]
        };
      }

      const [proxyHost, proxyPort] = proxy.listen.split(':');
      const [upstreamHost, upstreamPort] = proxy.upstream.split(':');

      let testCommands = `🧪 **Test Commands for Proxy '${proxyName}'**\n\n`;
      testCommands += `**Proxy Details:**\n`;
      testCommands += `- Listen: ${proxy.listen}\n`;
      testCommands += `- Upstream: ${proxy.upstream}\n`;
      testCommands += `- Status: ${proxy.enabled ? 'Enabled' : 'Disabled ⚠️'}\n\n`;

      if (testType === "database") {
        testCommands += `**Database Connection Tests:**\n\`\`\`bash\n`;
        testCommands += `# Test direct connection to proxy\ntelnet ${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost} ${proxyPort}\n\n`;
        testCommands += `# Test PostgreSQL connection via proxy\npsql -h ${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost} -p ${proxyPort} -U your_username -d your_database\n\n`;
        if (dbPort) {
          testCommands += `# Test if iptables redirect is working (should connect via proxy)\npsql -h localhost -p ${dbPort} -U your_username -d your_database\n\n`;
        }
        testCommands += `# Test direct upstream connection (bypass proxy)\npsql -h ${upstreamHost} -p ${upstreamPort} -U your_username -d your_database\n`;
        testCommands += `\`\`\`\n\n`;
      } else if (testType === "rabbitmq") {
        testCommands += `**RabbitMQ Connection Tests:**\n\`\`\`bash\n`;
        testCommands += `# Test connection to RabbitMQ management API via proxy\ncurl -u guest:guest http://${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost}:1${proxyPort}/api/overview\n\n`;
        testCommands += `# Test AMQP connection via proxy (if you have amqp-tools)\namqp-declare-queue -H ${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost} -P ${proxyPort} -u guest -p guest test-queue\n\n`;
        testCommands += `# Test direct upstream\ncurl -u guest:guest http://${upstreamHost}:${parseInt(upstreamPort) + 10000}/api/overview\n`;
        testCommands += `\`\`\`\n\n`;
      } else if (testType === "http") {
        testCommands += `**HTTP Connection Tests:**\n\`\`\`bash\n`;
        testCommands += `# Test HTTP connection via proxy\ncurl -v http://${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost}:${proxyPort}/\n\n`;
        testCommands += `# Test with timing to see latency effects\ntime curl http://${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost}:${proxyPort}/\n\n`;
        testCommands += `# Test direct upstream\ncurl -v http://${upstreamHost}:${upstreamPort}/\n`;
        testCommands += `\`\`\`\n\n`;
      }

      testCommands += `**Network Connectivity Tests:**\n\`\`\`bash\n`;
      testCommands += `# Check if proxy port is listening\nss -tln | grep :${proxyPort}\n\n`;
      testCommands += `# Check if upstream is reachable\ntelnet ${upstreamHost} ${upstreamPort}\n\n`;
      testCommands += `# Test with nc (netcat)\necho "test" | nc ${proxyHost === '0.0.0.0' ? 'localhost' : proxyHost} ${proxyPort}\n`;
      testCommands += `\`\`\`\n\n`;

      if (proxy.toxics && proxy.toxics.length > 0) {
        testCommands += `**Active Toxics (expect these effects):**\n`;
        for (const toxic of proxy.toxics) {
          const attrs = Object.entries(toxic.attributes || {}).map(([k, v]) => `${k}=${v}`).join(', ');
          testCommands += `- ${toxic.name}: ${toxic.type} (${toxic.stream}, ${toxic.toxicity * 100}%) - ${attrs}\n`;
        }
        testCommands += `\n`;
      }

      testCommands += `**Expected Results:**\n`;
      if (proxy.enabled) {
        testCommands += `- ✅ Connections should succeed but may be slow/affected by toxics\n`;
        if (proxy.toxics?.some((t: any) => t.type === 'latency')) {
          testCommands += `- ⏱️  Expect increased response times due to latency toxic\n`;
        }
        if (proxy.toxics?.some((t: any) => t.type === 'bandwidth')) {
          testCommands += `- 🐌 Expect slower data transfer due to bandwidth limiting\n`;
        }
        if (proxy.toxics?.some((t: any) => t.type === 'timeout')) {
          testCommands += `- ⏰ Expect connection timeouts or dropped connections\n`;
        }
      } else {
        testCommands += `- ❌ Connections should fail (proxy is disabled)\n`;
      }

      return {
        content: [{
          type: "text",
          text: testCommands
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to generate test commands!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  });

  // Troubleshooting guide tool
  server.registerTool("show_troubleshooting_guide", {
    title: "Show Troubleshooting Guide",
    description: "Display comprehensive troubleshooting guide for common Toxiproxy issues",
    inputSchema: {}
  }, async () => {
    return {
      content: [{
        type: "text",
        text: `# 🔧 Toxiproxy Troubleshooting Guide

## 🚨 Common Issues & Quick Fixes

### 1. "Cannot connect to Toxiproxy server"
**Symptoms:** MCP tools fail with connection errors

**Solutions:**
\`\`\`bash
# Check if Toxiproxy is running
docker ps | grep toxiproxy

# Start Toxiproxy server
docker run --rm -it --network=host --add-host=dev.localhost:127.0.0.1 ghcr.io/shopify/toxiproxy:2.5.0 -host 0.0.0.0

# Check if port 8474 is available
lsof -i :8474
\`\`\`

### 2. "Application connects normally (toxics not working)"
**Symptoms:** Proxy created, toxics added, but no network effects

**Solutions:**
\`\`\`bash
# Check iptables rule was applied
sudo iptables -t nat -L PREROUTING --line-numbers

# Add missing iptables rule (replace ports)
sudo iptables -t nat -A PREROUTING -p tcp --dport 15234 -j REDIRECT --to-port 25234

# Verify connections go through proxy
netstat -an | grep ESTABLISHED | grep 15234
\`\`\`

### 3. "Connection refused" to proxy
**Symptoms:** Direct proxy connection fails

**Solutions:**
\`\`\`bash
# Check proxy status
curl http://localhost:8474/proxies/[proxy-name]

# Check if upstream service is running
telnet dev.localhost 15234
\`\`\`

## 🔍 Step-by-Step Diagnostics

### Step 1: Verify Toxiproxy
\`\`\`bash
curl http://localhost:8474/version
curl http://localhost:8474/proxies
\`\`\`

### Step 2: Check Proxy Config
\`\`\`bash
curl http://localhost:8474/proxies/[proxy-name]
\`\`\`

### Step 3: Test Connectivity
\`\`\`bash
# Proxy port
telnet localhost [proxy-port]

# Upstream directly
telnet [upstream-host] [upstream-port]
\`\`\`

## 📊 Network Flow Diagram

**Normal Flow:**
\`\`\`
App -----> Database
:5432      :15234
\`\`\`

**With Toxiproxy:**
\`\`\`
App -----> iptables -----> Toxiproxy -----> Database
:5432      redirect      :25234        :15234
           to :25234     (proxy)
\`\`\`

## 🎯 Use These MCP Tools

- \`troubleshoot_connectivity\` - Automated diagnostics
- \`check_iptables_rules\` - iptables management  
- \`generate_test_commands\` - Custom test commands
- \`list_proxies\` - Current proxy status
- \`check_toxiproxy_status\` - Server connectivity

**💡 Pro Tip:** Always test direct upstream connectivity first, then proxy, then with iptables rules!`
      }]
    };
  });
}