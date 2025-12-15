export interface NewsItem {
  title: string
  link: string
  publishedAt?: string
  source: string
  categories?: string[]
  summary?: string
}

export interface FeedConfig {
  id: string
  label: string
  url: string
  topicHints?: string[]
}
