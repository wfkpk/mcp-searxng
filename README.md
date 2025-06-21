# MCP SearXNG Search

An MCP server for privacy-focused web search and article scraping using SearXNG instances.

## Tools

- **scrape_article**

  - Extract clean article content from any webpage
  - Inputs:
    - `url` (string): URL to scrape

- **search**
  - Search and automatically scrape top 5 results
  - Inputs:
    - `query` (string): Search terms
    - `searxng_url` (string, optional): SearXNG instance URL

## Configuration

#### NPX

```json
{
  "mcpServers": {
    "searxng": {
      "command": "npx",
      "args": ["-y", "mcp-searxng-search"],
      "env": {
        "SEARXNG_URL": "https://searx.be"
      }
    }
  }
}
```

#### Local Development

```json
{
  "mcpServers": {
    "searxng": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/mcp-searxng",
      "env": {
        "SEARXNG_URL": "https://searx.be"
      }
    }
  }
}
```

## Popular SearXNG Instances

- `https://searx.be`
- `https://search.sapti.me`
- `https://searx.tiekoetter.com`
- `https://searx.work`

## Build

```bash
npm install
npm run build
```

## License

MIT
