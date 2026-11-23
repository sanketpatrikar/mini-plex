export const MAX_QUERY_LENGTH = 500

export type Source = { id: number; title: string; url: string }
export type SearchResult = { answer: string; sources: Source[]; demo?: boolean; sourcesOnly?: boolean }
