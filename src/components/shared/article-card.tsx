"use client"

import { formatArticleTime, getDomain } from "@/lib/utils"

interface ArticleCardProps {
  url: string
  title: string
  description?: string
  highlights?: string[]
  image?: string
  publishedDate?: string
  author?: string
  score?: number
  className?: string
  variant?: "default" | "compact" | "minimal"
}

// Source badge colors based on tier
const SOURCE_COLORS: Record<string, string> = {
  "theinformation.com": "bg-amber-500/10 text-amber-600",
  "bloomberg.com": "bg-purple-500/10 text-purple-600",
  "wsj.com": "bg-slate-500/10 text-slate-600",
  "ft.com": "bg-rose-500/10 text-rose-600",
  "techcrunch.com": "bg-green-500/10 text-green-600",
  "axios.com": "bg-blue-500/10 text-blue-600",
  "newcomer.co": "bg-orange-500/10 text-orange-600",
  "stratechery.com": "bg-indigo-500/10 text-indigo-600",
}

function getSourceColor(domain: string): string {
  return SOURCE_COLORS[domain] || "bg-muted text-muted-foreground"
}

/**
 * Premium article card with elegant design
 */
export function ArticleCard({
  url,
  title,
  description,
  highlights,
  image,
  publishedDate,
  author,
  className = "",
  variant = "default",
}: ArticleCardProps) {
  const domain = getDomain(url)
  const displayTime = formatArticleTime(publishedDate)
  const displayText = highlights?.[0] || description
  const sourceColor = getSourceColor(domain)

  if (variant === "minimal") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block py-4 border-b border-border/50 last:border-0 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceColor}`}>
                {domain}
              </span>
              {displayTime && (
                <span className="text-[11px] text-muted-foreground/60">
                  {displayTime}
                </span>
              )}
            </div>
            <h3 className="text-[15px] font-medium leading-snug text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2">
              {title}
            </h3>
          </div>
          {image && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <img
                src={image}
                alt=""
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </div>
          )}
        </div>
      </a>
    )
  }

  if (variant === "compact") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block ${className}`}
      >
        <div className="flex gap-4 p-4 rounded-xl bg-card/50 hover:bg-card border border-transparent hover:border-border/50 transition-all duration-200">
          {image && (
            <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
              <img
                src={image}
                alt=""
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceColor}`}>
                {domain}
              </span>
              {displayTime && (
                <span className="text-[11px] text-muted-foreground/60">
                  {displayTime}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium leading-snug text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2">
              {title}
            </h3>
            {author && (
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                by {author}
              </p>
            )}
          </div>
        </div>
      </a>
    )
  }

  // Default variant - full card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block ${className}`}
    >
      <article className="h-full rounded-2xl overflow-hidden bg-card/30 hover:bg-card/60 border border-border/30 hover:border-border/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5">
        {image && (
          <div className="aspect-[16/10] relative overflow-hidden bg-muted">
            <img
              src={image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}
        <div className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md ${sourceColor}`}>
              {domain}
            </span>
            {displayTime && (
              <span className="text-[11px] text-muted-foreground/50">
                {displayTime}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-snug text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          {displayText && (
            <p className="text-[13px] leading-relaxed text-muted-foreground/70 line-clamp-2">
              {displayText}
            </p>
          )}
          {author && (
            <p className="text-[11px] text-muted-foreground/50 mt-3 pt-3 border-t border-border/30">
              {author}
            </p>
          )}
        </div>
      </article>
    </a>
  )
}

/**
 * Hero/Featured article with dramatic presentation
 */
export function FeaturedArticleCard({
  url,
  title,
  description,
  highlights,
  image,
  publishedDate,
  author,
}: ArticleCardProps) {
  if (!image) return null

  const domain = getDomain(url)
  const displayTime = formatArticleTime(publishedDate)
  const displayText = highlights?.[0] || description
  const sourceColor = getSourceColor(domain)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mb-10 group"
    >
      <article className="relative rounded-3xl overflow-hidden">
        <div className="aspect-[2.2/1] relative">
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/20 text-white backdrop-blur-sm`}>
                {domain}
              </span>
              {displayTime && (
                <span className="text-[12px] text-white/60">
                  {displayTime}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white group-hover:text-white/90 transition-colors line-clamp-2 mb-3">
              {title}
            </h2>
            {displayText && (
              <p className="text-[15px] leading-relaxed text-white/70 line-clamp-2 max-w-2xl">
                {displayText}
              </p>
            )}
            {author && (
              <p className="text-[12px] text-white/50 mt-4">
                {author}
              </p>
            )}
          </div>
        </div>
      </article>
    </a>
  )
}

/**
 * Spotlight card - for highlighting important stories
 */
export function SpotlightCard({
  url,
  title,
  description,
  highlights,
  image,
  publishedDate,
  author,
}: ArticleCardProps) {
  const domain = getDomain(url)
  const displayTime = formatArticleTime(publishedDate)
  const displayText = highlights?.[0] || description
  const sourceColor = getSourceColor(domain)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <article className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 hover:border-primary/20 transition-all duration-300">
        {image && (
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
        )}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md ${sourceColor}`}>
              {domain}
            </span>
            {displayTime && (
              <span className="text-[11px] text-muted-foreground/60">
                {displayTime}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3 mb-3">
            {title}
          </h3>
          {displayText && (
            <p className="text-[14px] leading-relaxed text-muted-foreground/80 line-clamp-3">
              {displayText}
            </p>
          )}
          {author && (
            <p className="text-[12px] text-muted-foreground/50 mt-4">
              by {author}
            </p>
          )}
        </div>
      </article>
    </a>
  )
}

