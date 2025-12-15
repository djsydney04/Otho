# News ingestion approach

We lean on publisher-provided RSS/Atom feeds instead of a paid news API. RSS/Atom is:

- Stable and cache-friendly (supports ETag/Last-Modified).
- API-less and widely supported by publishers.
- Easy to extend with curated directories plus user-provided feeds.

## Integration points

- **Home feed**: call `/api/news?scope=home` to populate the general news module.
- **Company feed**: call `/api/news?company=<name>&industry=<industry>` to bias items for a company profile. Keywords are derived from the parameters.

The response shape is:

```json
{
  "count": 42,
  "keywords": ["Acme", "Fintech"],
  "items": [
    {
      "title": "Acme raises new round",
      "link": "https://example.com/article",
      "publishedAt": "2025-12-15T00:00:00Z",
      "source": "example.com",
      "categories": ["fintech"],
      "summary": "Optional summary if present in the feed"
    }
  ]
}
```

## How it works

- `src/lib/news/rss.ts` defines curated feeds and a cache (15 minutes) that respects `ETag`/`Last-Modified` headers for conditional requests.
- Items are normalized and de-duplicated by canonical URL (fallback: title + source + time) and sorted by recency.
- Keyword filtering is applied server-side so the same API can serve home (no keywords) and company/industry-specific feeds.

## Extending

- Add feeds to `CURATED_FEEDS` with an `id`, `label`, `url`, and optional `topicHints` to organize the directory.
- Future user-managed feeds can be appended to the `feeds` list passed into `fetchNews`.
