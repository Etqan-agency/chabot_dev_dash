import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ListTree, RotateCcw } from 'lucide-react'
import { guidedTreeApi, treeLanguagesApi } from '@/lib/endpoints'
import { useI18n } from '@/hooks/useI18n'
import type { GuidedTreeNode } from '@/types/api'

/**
 * The guided question tree as an end user meets it inside the chat: tappable
 * questions above the composer. A tap posts the question and its stored answer
 * into the conversation (via `onPick`) and descends into its sub-questions.
 * Renders nothing when the tenant has no tree.
 */
export function GuidedQuestions({
  onPick,
  resetKey,
  disabled,
}: {
  onPick: (node: GuidedTreeNode) => void
  /** Changes when the conversation is cleared — returns to the root questions. */
  resetKey: number
  disabled?: boolean
}) {
  const { t, dir } = useI18n()
  const [language, setLanguage] = useState<string | undefined>(undefined) // undefined = canonical
  const [path, setPath] = useState<GuidedTreeNode[]>([])

  const languages = useQuery({
    queryKey: ['tree-languages'],
    queryFn: () => treeLanguagesApi.list(true),
  })
  const treeQuery = useQuery({
    queryKey: ['guided-tree', language ?? ''],
    queryFn: () => guidedTreeApi.tree(language),
  })

  useEffect(() => setPath([]), [resetKey, language])

  const tree = treeQuery.data?.tree ?? []
  if (tree.length === 0 && !language) return null

  const current = path[path.length - 1] ?? null
  const options = current ? current.children : tree
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const langs = languages.data ?? []
  const active = treeQuery.data?.language

  function pick(node: GuidedTreeNode) {
    onPick(node)
    setPath((p) => [...p, node])
  }

  return (
    <div className="border-b border-border/60 px-3 pb-2 pt-2.5 sm:px-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
        <ListTree className="size-3.5 shrink-0 text-brand-500" />
        <span className="min-w-0 flex-1 truncate font-medium" dir="auto">
          {current ? current.title : t('tree.preview.root')}
        </span>
        {path.length > 0 && (
          <>
            <button
              onClick={() => setPath((p) => p.slice(0, -1))}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 hover:bg-surface2 hover:text-fg"
            >
              <BackIcon className="size-3.5" /> {t('common.back')}
            </button>
            <button
              onClick={() => setPath([])}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface2 hover:text-fg"
            >
              <RotateCcw className="size-3" /> {t('tree.preview.restart')}
            </button>
          </>
        )}
        {langs.length > 1 && (
          <select
            value={active ?? ''}
            onChange={(e) =>
              setLanguage(
                e.target.value === treeQuery.data?.canonical_language ? undefined : e.target.value,
              )
            }
            aria-label={t('tree.languages')}
            className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-fg"
          >
            {langs.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {options.length > 0 ? (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.id}
              dir="auto"
              disabled={disabled}
              onClick={() => pick(o)}
              className="animate-msg-in flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-start text-sm text-fg shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-400"
            >
              {o.title}
              {o.children.length > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-faint rtl:rotate-180" />
              )}
            </button>
          ))}
        </div>
      ) : (
        current &&
        !current.answer && <p className="text-xs text-muted">{t('tree.preview.leafEmpty')}</p>
      )}
    </div>
  )
}
