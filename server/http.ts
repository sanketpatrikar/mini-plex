export class SearchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function post<T>(
  url: string,
  headers: Record<string, string>,
  body: object,
  service: string,
  timeoutMs = 20_000,
): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs)
  const timeoutError = () => new SearchError(`${service} timed out. Please try again.`, 504)
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
    if (response.status === 408 || response.status === 504) throw timeoutError()
    if (response.status === 503) throw new SearchError(`${service} is temporarily unavailable. Please try again.`, 503)
    if ([402, 429, 432].includes(response.status)) {
      throw new SearchError(`${service} quota reached. Try again later.`, 429)
    }
    if (response.status === 401 || response.status === 403) {
      throw new SearchError(`Check the server's ${service} API key and project access.`, 502)
    }
    if (!response.ok) throw new SearchError(`${service} is unavailable (${response.status}).`, 502)
    return await response.json() as T
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw timeoutError()
    }
    throw error
  }
}
