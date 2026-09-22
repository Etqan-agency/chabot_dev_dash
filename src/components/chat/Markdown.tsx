import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * remark-gfm auto-links `http(s)://` and `www.` URLs, but not bare domains like
 * `example.com/path`. Prefix those with https:// so they become clickable links.
 * Skips anything already inside a scheme, email, or existing link.
 */
function linkifyBareUrls(md: string): string {
  return md.replace(
    /(^|[^\w/@.])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\/[^\s)]*)/gi,
    (full, pre: string, url: string) => (/^https?:\/\//i.test(url) ? full : `${pre}https://${url}`),
  )
}

/** True for URLs that point at an image file (optionally with a query string). */
function isImageUrl(url?: string): boolean {
  if (!url) return false
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url.trim())
}

/** A chat image: rounded, constrained, click to open full-size in a new tab. */
function ChatImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null
  return (
    <a href={src} target="_blank" rel="noreferrer" className="my-2 block">
      <img
        src={src}
        alt={alt || 'image'}
        loading="lazy"
        className="max-h-72 w-auto max-w-full cursor-zoom-in rounded-xl border border-border object-cover shadow-sm transition-opacity hover:opacity-90"
      />
    </a>
  )
}

/**
 * Renders an assistant answer (which may contain Markdown) with styling that
 * works inside a chat bubble. No typography plugin — elements are styled
 * explicitly via component overrides.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          // Markdown images: ![alt](url)
          img: ({ src, alt }) => <ChatImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
          // Links: render image URLs as images, everything else as a link.
          a: ({ children, href }) =>
            isImageUrl(href) ? (
              <ChatImage src={href} alt={typeof children === 'string' ? children : undefined} />
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-steel-600 underline underline-offset-2 hover:text-steel-500 dark:text-steel-300"
              >
                {children}
              </a>
            ),
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 ps-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 ps-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="marker:text-faint">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 text-sm font-semibold">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-s-2 border-brand-300 ps-3 text-muted">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-')
            if (isBlock) {
              return (
                <code className="block whitespace-pre rounded-lg bg-navy-900 p-3 font-mono text-[13px] text-cream-50">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[0.85em] text-fg">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="mb-2 overflow-x-auto last:mb-0">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-surface2 px-2 py-1 text-start font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {linkifyBareUrls(children)}
      </ReactMarkdown>
    </div>
  )
}
