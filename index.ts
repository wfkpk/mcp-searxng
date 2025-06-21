#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const SEARXNG_URL = process.env.SEARXNG_URL;
if (!SEARXNG_URL) {
  console.error("Error: BRAVE_API_KEY environment variable is required");
  process.exit(1);
}

console.error(`Using SearXNG instance: ${SEARXNG_URL}`);

function urlJoin(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

function extractDate($: cheerio.CheerioAPI): string | null {
  const possible: Array<string> = [
    'meta[name="article:published_time"]',
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publish-date"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]',
  ];

  for (const sel of possible) {
    const el = $(sel);
    if (el.length && el.attr("content")) return el.attr("content")!;
  }

  const timeEl = $("time");
  if (timeEl.length) {
    return timeEl.attr("datetime") || timeEl.text().trim() || null;
  }

  const dateRegex =
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}(,?\s+\d{1,2}:\d{2}\s+[A-Z]{2,4})?/;
  const texts = $("span, div")
    .toArray()
    .map((el: any) => $(el).text().trim());
  for (const t of texts) {
    const m = t.match(dateRegex);
    if (m) return m[0];
  }

  return null;
}

async function scrapeArticleInfo(url: string) {
  try {
    const resp = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const html = resp.data as string;
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      article?.title ||
      "No title";

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    const date = extractDate($);

    return {
      success: true,
      data: {
        title,
        description,
        date,
        text: article?.textContent?.trim().substring(0, 4000) || "",
        url,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to scrape article: ${err.message}`,
      url,
    };
  }
}

async function searchSearXNG(
  query: string,
  searxngUrl: string = SEARXNG_URL || ""
) {
  try {
    const response = await axios.get(`${searxngUrl}/search`, {
      params: {
        q: query,
        format: "json",
      },
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `SearXNG search failed: ${err.message}`,
    };
  }
}

const tools: Tool[] = [
  {
    name: "searxng_search",
    description:
      "Performs a web search using a public or self-hosted SearXNG instance. " +
      "Ideal for privacy-friendly search queries across multiple engines including news, blogs, academic, and technical sources. " +
      "Use this for general-purpose web search without any tracking or profiling. " +
      "Returns raw results as-is from the search aggregator.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query text",
        },
        searxng_url: {
          type: "string",
          description: `URL of the SearXNG instance to use (default: ${SEARXNG_URL})`,
          default: SEARXNG_URL,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "scrape_article",
    description:
      "Extracts the main article content from a given URL. " +
      "Best used for cleaning and isolating the readable text from news sites, blog posts, research articles, and other content-heavy pages. " +
      "Returns structured data including title, body, and optional metadata. " +
      "Use this when you already have a URL and want the actual text content for summarization, analysis, or storage.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Direct URL of the article or content page",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "search",
    description:
      "Performs a web search using a SearXNG instance and automatically scrapes the full article content from the top 5 results. " +
      "Combines search and extraction in a single step—ideal for quickly collecting real content from multiple sources. " +
      "Best used when you need not just links but the actual readable text for summarization, NLP tasks, or embeddings. " +
      "Returns full page text, titles, and metadata from relevant results.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find relevant articles",
        },
        searxng_url: {
          type: "string",
          description: `SearXNG instance URL for executing the query (default: ${SEARXNG_URL})`,
          default: SEARXNG_URL,
        },
      },
      required: ["query"],
    },
  },
];

const server = new Server(
  {
    name: "searxng-scraper",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "searxng_search": {
        const { query, searxng_url = SEARXNG_URL } = args as {
          query: string;
          searxng_url?: string;
        };

        const result = await searchSearXNG(query, searxng_url);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${result.error}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }

      case "scrape_article": {
        const { url } = args as { url: string };
        const result = await scrapeArticleInfo(url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "search": {
        const { query, searxng_url = SEARXNG_URL } = args as {
          query: string;
          searxng_url?: string;
        };

        const searchResult = await searchSearXNG(query, searxng_url);
        if (!searchResult.success) {
          return {
            content: [
              {
                type: "text",
                text: `Search error: ${searchResult.error}`,
              },
            ],
          };
        }

        const results =
          (searchResult.data as { results?: any[] }).results || [];
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No search results found",
              },
            ],
          };
        }

        const top5Results = results.slice(0, 5);
        const scrapedResults = [];

        for (const result of top5Results) {
          if (result.url) {
            console.error(`Scraping: ${result.url}`);
            const scrapeResult = await scrapeArticleInfo(result.url);
            scrapedResults.push({
              search_result: {
                title: result.title,
                url: result.url,
                content: result.content || "",
              },
              scraped_content: scrapeResult,
            });

            // Add small delay between requests
            //await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  total_results: results.length,
                  scraped_count: scrapedResults.length,
                  results: scrapedResults,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SearXNG Scraper MCP Server running on stdio");
}
main().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
