# Toxiproxy MCP Server

A Model Context Protocol (MCP) server for managing Toxiproxy proxies to simulate network conditions in testing environments.

## Overview

This MCP server provides tools to:
- Create proxies for PostgreSQL and RabbitMQ databases
- Add various toxics (latency, bandwidth, timeout) to simulate network issues
- Manage proxy lifecycle and port forwarding rules
- Reset and clean up testing environments

## Prerequisites

1. **Start Toxiproxy Server** (required before using this MCP server):
   ```bash
   docker run --rm -it \
     --network=host \
     --add-host=dev.localhost:127.0.0.1 \
     ghcr.io/shopify/toxiproxy:2.5.0 -host 0.0.0.0
   ```

2. **Build the MCP Server**:
   ```bash
   npm install
   npm run build
   ```

## Available Tools

### 1. `check_toxiproxy_status`
Check if the Toxiproxy server is running and accessible.

### 2. `create_db_proxy`
Create a PostgreSQL database proxy.
- **Parameters**: `name`, `dbPort`, `proxyPort` (optional), `upstream` (optional)
- **Example**: Create proxy for database on port 15234

### 3. `create_rabbitmq_proxy`
Create a RabbitMQ proxy.
- **Parameters**: `name`, `amqpPort` (optional, defaults to 5672), `proxyPort` (optional), `upstream` (optional)

### 4. `add_latency_toxic`
Add latency simulation to a proxy.
- **Parameters**: `proxyName`, `latency` (ms), `jitter` (optional), `toxicity` (optional), `direction` (optional)
- **Example**: Add 2000ms latency with 100ms jitter

### 5. `add_bandwidth_toxic`
Add bandwidth limiting to a proxy.
- **Parameters**: `proxyName`, `rate` (KB/s), `toxicity` (optional), `direction` (optional)

### 6. `add_timeout_toxic`
Add timeout simulation to a proxy.
- **Parameters**: `proxyName`, `timeout` (ms), `toxicity` (optional), `direction` (optional)

### 7. `list_proxies`
List all active proxies and their toxics.

### 8. `remove_toxic`
Remove a specific toxic from a proxy.
- **Parameters**: `proxyName`, `toxicName`

### 9. `delete_proxy`
Delete a proxy entirely.
- **Parameters**: `proxyName`

### 10. `reset_proxies`
Reset all proxies (remove all toxics and enable all proxies).

## Usage Workflow

1. **Start Toxiproxy server** (see prerequisites)
2. **Check status**: `check_toxiproxy_status`
3. **Create proxy**: `create_db_proxy` with your database port
4. **Run the iptables command** provided by the tool (requires sudo)
5. **Add toxics**: Use `add_latency_toxic`, `add_bandwidth_toxic`, etc.
6. **Test your application** - it should now experience the simulated network conditions
7. **Clean up**: Use `remove_toxic`, `delete_proxy`, or `reset_proxies`

## Example Session

```bash
# 1. Check if Toxiproxy is running
check_toxiproxy_status

# 2. Create a database proxy for PostgreSQL on port 15234
create_db_proxy name="postgres_proxy" dbPort=15234

# 3. Run the iptables command shown in the output (with sudo)
sudo iptables -t nat -A PREROUTING -p tcp --dport 15234 -j REDIRECT --to-port 25234

# 4. Add latency toxic
add_latency_toxic proxyName="postgres_proxy" latency=2000 jitter=100

# 5. Your application will now experience 2s latency when connecting to the database

# 6. List all proxies to see current state
list_proxies

# 7. Clean up when done
reset_proxies
```

## Port Forwarding

The MCP server generates iptables commands for you to run manually. This approach:
- Gives you visibility into what network changes are being made
- Avoids requiring the MCP server to run with sudo privileges
- Allows you to manage and remove rules as needed

**To add a rule**: Copy and run the command provided by `create_db_proxy` or `create_rabbitmq_proxy`
**To remove a rule**: Use the removal command also provided, or list rules with:
```bash
sudo iptables -t nat -L PREROUTING --line-numbers
sudo iptables -t nat -D PREROUTING <line_number>
```

## Troubleshooting

- **"Cannot connect to Toxiproxy server"**: Make sure the Docker container is running on port 8474
- **"Proxy not found"**: Check the proxy name and use `list_proxies` to see available proxies  
- **Network traffic not being intercepted**: Verify the iptables rule was applied correctly
- **Permission denied for iptables**: The commands need to be run with `sudo`

## License

ISC# toxiproxy-mcp-server
