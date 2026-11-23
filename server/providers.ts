import { post, SearchError } from "./http"

type WebResult = { title?: string; url: string }
type SearchHit = { title: string; url: string; content: string }
const limit = 5

function bearer(key: string | undefined, variable: string): Record<string, string> {
  if (!key) throw new SearchError(`Set ${variable} in .env, or enable demo mode.`, 503)
  return { Authorization: `Bearer ${key}` }
}

function normalize(result: WebResult, content: string): SearchHit {
  return { title: result.title ?? "", url: result.url, content: content.trim().slice(0, 2000) }
}

const providers = {
  async exa(query: string) {
    const { results } = await post<{ results: Array<WebResult & { highlights?: string[] }> }>(
      "https://api.exa.ai/search",
      bearer(Bun.env.EXA_API_KEY, "EXA_API_KEY"),
      { query, type: "lite", numResults: limit, contents: { highlights: true } },
      "Exa",
    )
    return results.map(result => normalize(result, result.highlights?.join("\n\n") ?? ""))
  },
  async tavily(query: string) {
    const { results } = await post<{ results: Array<WebResult & { content: string }> }>(
      "https://api.tavily.com/search",
      bearer(Bun.env.TAVILY_API_KEY, "TAVILY_API_KEY"),
      { query, search_depth: "basic", auto_parameters: false, max_results: limit },
      "Tavily",
    )
    return results.map(result => normalize(result, result.content))
  },
  async firecrawl(query: string) {
    const key = Bun.env.FIRECRAWL_API_KEY
    const { success, data } = await post<{
      success: boolean
      data?: { web?: Array<WebResult & { description?: string }> }
    }>(
      "https://api.firecrawl.dev/v2/search",
      key ? bearer(key, "FIRECRAWL_API_KEY") : {},
      { query, limit, sources: ["web"] },
      "Firecrawl",
    )
    if (!success) throw new SearchError("Firecrawl search failed. Try again.", 502)
    return (data?.web ?? []).map(result => normalize(result, result.description ?? ""))
  },
}

export async function findSearchHits(query: string): Promise<SearchHit[]> {
  const provider = Bun.env.SEARCH_PROVIDER?.trim().toLowerCase() || "exa"
  if (!Object.hasOwn(providers, provider)) {
    throw new SearchError("Set SEARCH_PROVIDER to exa, tavily, or firecrawl.", 503)
  }

  const hits = await providers[provider as keyof typeof providers](query)
  return hits.filter(({ url, content }) => {
    if (!content) return false
    const parsed = URL.parse(url)
    return parsed?.protocol === "https:" || parsed?.protocol === "http:"
  }).slice(0, limit)
}
