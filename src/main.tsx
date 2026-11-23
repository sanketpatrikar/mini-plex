import { useRef, useState, type FormEvent } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { CircleAlert, Globe, Search, X } from "lucide-react"
import Markdown from "react-markdown"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Message, MessageContent } from "@/components/ui/message"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { MAX_QUERY_LENGTH, type SearchResult } from "../shared/search"
import "./index.css"

const suggestions = [
  "How do solar panels work?",
  "What’s new in TypeScript?",
  "Why is the sky blue?",
]

async function runSearch(query: string, signal: AbortSignal): Promise<SearchResult> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error ?? "The search service is unavailable. Try again.")
  if (!data) throw new Error("The search service returned an unreadable response.")
  return data
}

function App() {
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const searchInput = useRef<HTMLInputElement>(null)
  const result = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => runSearch(query, signal),
    enabled: Boolean(query),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  function submit(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setInput(trimmed)
    if (trimmed === query) {
      if (!result.isFetching) void result.refetch()
      return
    }
    setQuery(trimmed)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(input)
  }

  function resetSearch() {
    setQuery("")
    clearInput()
  }

  function clearInput() {
    setInput("")
    searchInput.current?.focus()
  }

  const sources = result.data?.sources ?? []
  const citations = new Map(sources.map(source => [String(source.id), source]))
  const answer = result.data?.answer.replace(/\[(\d+)\](?!\()/g, (_, id: string) =>
    citations.has(id) ? `[${id}](#source-${id})` : "",
  )

  return (
    <div className={`search-page ${query ? "search-page-results" : "search-page-home"}`}>
      <header className="search-header">
        <div className="search-header-content">
          <span className="text-copy-16 font-semibold">Mini Plex</span>
          {query && (
            <Button variant="outline" className="search-reset" onClick={resetSearch}>
              New search
            </Button>
          )}
        </div>
      </header>

      <main className="search-main">
        {!query && (
          <div className="search-intro">
            <h1 className="text-heading-40">Search the web</h1>
            <p className="text-copy-16">Get answers with links to the sources.</p>
          </div>
        )}

        {query && (
          <section className="search-results" aria-label="Search results" aria-busy={result.isFetching}>
            <h1 className="search-query text-heading-24">{query}</h1>
            {result.isFetching && (
              <p role="status" className="search-status text-copy-14">
                <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                Searching the web…
              </p>
            )}
            {result.isError && (
              <Alert variant="destructive" className="search-error material-base">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Search failed</AlertTitle>
                <AlertDescription>
                  <p>{result.error.message}</p>
                  <Button variant="outline" onClick={() => void result.refetch()}>Try again</Button>
                </AlertDescription>
              </Alert>
            )}
            {result.data && (
              <Message key={query}>
                <MessageContent className="search-answer material-base">
                  <div className="search-answer-heading">
                    <h2 className="text-heading-20">{result.data.sourcesOnly ? "Web results" : "Answer"}</h2>
                    {result.data.demo && <Badge variant="secondary">Demo</Badge>}
                  </div>
                  <div className="search-answer-copy text-copy-16">
                    <Markdown components={{
                      a: ({ href, children }) => {
                        const source = href?.startsWith("#source-") ? citations.get(href.slice(8)) : undefined
                        if (!source) return <span>{children}</span>
                        return (
                          <Badge asChild variant="secondary" className="search-citation">
                            <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Source ${source.id}: ${source.title}`}>{source.id}</a>
                          </Badge>
                        )
                      },
                      img: ({ alt }) => <span>{alt}</span>,
                    }}>{answer}</Markdown>
                  </div>
                  {!result.data.sourcesOnly && sources.length > 0 && !/\[\d+\]\(#source-\d+\)/.test(answer ?? "") && <p className="text-sm text-muted-foreground">No inline citations were returned.</p>}
                  {sources.length > 0 && (
                    <Trace className="search-sources">
                      <TraceCollapsible key={result.dataUpdatedAt} defaultOpen={result.data.sourcesOnly}>
                        <TraceCollapsibleTrigger className="search-source-trigger">
                          <TraceLine>
                            <TraceIcon><Globe aria-hidden="true" /></TraceIcon>
                            <TraceTitle>{sources.length} {sources.length === 1 ? "source" : "sources"} found</TraceTitle>
                          </TraceLine>
                        </TraceCollapsibleTrigger>
                        <TraceCollapsibleContent>
                          <Trace>
                            {sources.map(source => (
                              <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="search-source-link">
                                <TraceLine>
                                  <Badge variant="secondary">{source.id}</Badge>
                                  <TraceTitle>{source.title || new URL(source.url).hostname}<span className="sr-only"> (opens in a new tab)</span></TraceTitle>
                                </TraceLine>
                              </a>
                            ))}
                          </Trace>
                        </TraceCollapsibleContent>
                      </TraceCollapsible>
                    </Trace>
                  )}
                </MessageContent>
              </Message>
            )}
          </section>
        )}
        <form onSubmit={handleSubmit} role="search" className={query ? "search-form search-dock" : "search-form"}>
          <InputGroup className="search-composer">
            <InputGroupInput
              ref={searchInput}
              type="search"
              aria-label="Search the web"
              placeholder="Search the web…"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Escape" && input) {
                  event.preventDefault()
                  clearInput()
                }
              }}
              maxLength={MAX_QUERY_LENGTH}
              required
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            {input && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton type="button" size="icon-xs" aria-label="Clear search" onClick={clearInput}>
                  <X aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          <Button type="submit" className="search-submit" disabled={!input.trim() || (result.isFetching && input.trim() === query)}>
            Search
          </Button>
        </form>

        {!query && (
          <div className="search-suggestions">
            {suggestions.map(question => (
              <Button key={question} type="button" variant="outline" size="sm" className="search-suggestion" onClick={() => submit(question)}>
                {question}
              </Button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const client = new QueryClient()
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}><App /></QueryClientProvider>,
)
