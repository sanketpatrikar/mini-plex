# Mini Plex

Mini Plex is a minimal AI search page. It retrieves web results with Exa by default, then uses Gemini to write an answer with clickable citations.

## Run locally

From this directory in PowerShell:

```powershell
bun install
Copy-Item .env.example .env
```

Set `GEMINI_API_KEY` and `EXA_API_KEY` in `.env`. Get an Exa key from the [Exa dashboard](https://dashboard.exa.ai/). To try the interface with sample data, set `DEMO_MODE=1`.

```powershell
bun run dev
```

Open http://127.0.0.1:5173. Vite proxies API requests to the Bun server on port 3001. Run `bun run check` for type checking.

## Switch search providers

Set `SEARCH_PROVIDER` in `.env` and restart `bun run dev`. If the page is already open, resubmit the query to refresh its answer.

| Setting | API key | Search method |
| --- | --- | --- |
| `exa` (default) | `EXA_API_KEY` | Lite Search with page highlights |
| `tavily` | `TAVILY_API_KEY` | Basic Search with excerpts |
| `firecrawl` | `FIRECRAWL_API_KEY` is optional | Search with descriptions. Keyless requests have daily per-IP limits. |

## Stack

- React, Vite, TypeScript, Tailwind CSS, and shadcn/ui.
- TanStack Query manages loading, retry, and a five-minute in-memory freshness window. The app uses a single screen.
- Bun serves `POST /api/search`. The selected provider returns up to five excerpts, which the server sends to `gemini-3.5-flash-lite`. Citation links resolve to URLs supplied by the provider.
- API keys stay on the server. The local app is stateless and needs no database. Add shared rate limits and access controls before exposing the API publicly.

Each service enforces its own quota. [Exa pricing](https://exa.ai/docs/admin/pricing) · [Tavily pricing](https://www.tavily.com/pricing) · [Firecrawl limits](https://docs.firecrawl.dev/rate-limits) · [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite)
