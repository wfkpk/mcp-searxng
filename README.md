# MCP SearXNG Search

An MCP server for privacy-focused web search and article scraping using SearXNG instances.

## Tools

- **searxng_search**

  - Execute web searches with titles, URLs, and snippets
  - Inputs:
    - `query` (string): Search terms
    - `searxng_url` (string, optional): SearXNG instance URL

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
      "args": ["-y", "mcp-searxng-scrape"],
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

## SearXNG Setup

For more details on SearXNG setup and customization, refer to the official SearXNG documentation:

🔗 [SearXNG Installation Guide](https://docs.searxng.org/admin/installation.html)

## License

MIT
