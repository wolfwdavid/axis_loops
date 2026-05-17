# 2nd Axis MCP Bridge

Exposes the 2nd Axis clone/pattern store as MCP tools over stdio.

## Running

```bash
npm run mcp
# or directly:
npx tsx --tsconfig src/mcp/tsconfig.json src/mcp/server.ts
```

## Tools

| Tool | Required inputs | Returns |
|------|----------------|---------|
| `list_clones` | — | `{ clones: Clone[] }` |
| `get_clone` | `id` | `{ clone: Clone \| null }` |
| `list_patterns` | `cloneId`, `loop?` ("presales"\|"customer") | `{ patterns: Pattern[] }` |
| `analyze_clone` | `cloneId`, `refresh?` (bool) | `{ patterns: Pattern[], cached: bool }` |
| `spawn_clone` | `companyName`, `vertical`, `icp`, `salesMotion`, `notes?` | `{ clone: Clone, suggestedName: string }` |
| `decide` | `cloneId`, `patternId`, `verdict` ("approve"\|"reject"\|"defer"), `sentTo?` | `{ decision: Decision }` |
| `read_transcript` | `filename` | `{ content: string }` |

`analyze_clone` with `refresh=true` and `spawn_clone` both require `ANTHROPIC_API_KEY`.

## Auth

Set `MCP_API_KEY` to require authentication:

```bash
MCP_API_KEY=my-secret npm run mcp
```

When set, every tool call must include `"apiKey": "my-secret"` in its arguments.  
Without `MCP_API_KEY` the server runs in unauthenticated dev mode (warns at startup).

## Claude Desktop integration

Add to your `claude_desktop_config.json` (usually `~/Library/Application Support/Claude/`):

```json
{
  "mcpServers": {
    "2nd-axis": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "C:\\Users\\Mkaru\\repos\\2nd_agent",
      "env": {
        "MCP_API_KEY": "your-secret-here"
      }
    }
  }
}
```
