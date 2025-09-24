# Copilot Instructions for toxi-mcp

## Project Overview

This is a **Model Context Protocol (MCP) server** built with TypeScript and the `@modelcontextprotocol/sdk`. MCP servers provide tools and resources to AI clients through a standardized protocol. The server communicates via stdin/stdout using `StdioServerTransport`.

## Architecture

- **Single-file server**: All server logic is in `src/index.ts`
- **Build target**: Compiles to `build/index.js` as an executable binary
- **Transport**: Uses stdio transport for MCP communication
- **Module system**: ES modules (`"type": "module"`) with Node16 resolution


## Development Workflow

- **Build**: `pnpm build` - Compiles TypeScript and makes executable
- **Package manager**: Uses pnpm (lockfile: `pnpm-lock.yaml`)
- **Entry point**: Binary exports as `toxi-mcp` command via `bin` field
- **File structure**: Keep all files in `src/`, builds to `build/`

## MCP-Specific Conventions

- Server name/version must match in both `package.json` and `McpServer` constructor
- Always use Zod schemas for input validation on tools
- Resource templates support URI parameter extraction
- All tool responses must return `content` array with `type` and content fields
- Resources return `contents` array with `uri` and content fields

## Dependencies

- `@modelcontextprotocol/sdk`: Core MCP functionality
- `zod`: Input validation and schema definition
- ES2022 target with Node16 modules for compatibility

## Extension Points

When adding features:
- New tools: Register with `server.registerTool()`  
- New resources: Register with `server.registerResource()` using URI templates
- Keep stdio transport - it's the MCP standard for server communication