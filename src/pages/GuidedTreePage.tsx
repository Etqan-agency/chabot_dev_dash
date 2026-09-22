import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Languages,
  ListTree,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { guidedTreeApi, treeLanguagesApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useMyFeatures } from '@/hooks/useMyFeatures'
import { Link } from 'react-router-dom'
import type { GuidedTreeNode } from '@/types/api'

/**
 * Guided question tree (FRONTEND_API.md §5c): author a tappable tree of
 * questions/answers in the canonical language; other languages are generated
 * as positional mirrors. Includes an edit view and an end-user preview.
 */
export default function GuidedTreePage() {
  const { t, dir } = useI18n()
  const { isAdmin } = useAuth()
  const { isOff } = useMyFeatures()
  // Reading the tree is always allowed; authoring 402s when the feature is off.
  const canAuthor = !isOff('guided_tree')
  const queryClient = useQueryClient()

  const [language, setLanguage] = useState<string | undefined>(undefined) // undefined = canonical
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [dialog, setDialog] = useState<
    | { kind: 'create'; parent: GuidedTreeNode | null }
    | { kind: 'edit'; node: GuidedTreeNode }
    | null
  >(null)
  const [toDelete, setToDelete] = useState<GuidedTreeNode | null>(null)
  const [langManagerOpen, setLangManagerOpen] = useState(false)

  const languages = useQuery({
    queryKey: ['tree-languages'],
    queryFn: () => treeLanguagesApi.list(true),
  })
  const treeQuery = useQuery({
    queryKey: ['guided-tree', language ?? ''],
    queryFn: () => guidedTreeApi.tree(language),
  })

  const invalidateTree = () => queryClient.invalidateQueries({ queryKey: ['guided-tree'] })

  const remove = useMutation({
    mutationFn: (id: string) => guidedTreeApi.remove(id),
    onSuccess: () => {
      void invalidateTree()
      setToDelete(null)
    },
  })
  const retranslate = useMutation({
    mutationFn: () => guidedTreeApi.retranslate(language),
  })

  const data = treeQuery.data
  const canonical = data?.canonical_language
  const viewingMirror = !!data && data.language !== data.canonical_language
  const tree = data?.tree ?? []

  return (
    <div>
      <PageHeader
        title={t('tree.title')}
        description={t('tree.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setLangManagerOpen(true)}>
                <Languages className="size-4" /> {t('tree.languages')}
              </Button>
            )}
            {canAuthor && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retranslate.mutate()}
                  loading={retranslate.isPending}
                  title={t('tree.retranslate.hint')}
                >
                  <RefreshCw className="size-4" /> {t('tree.retranslate')}
                </Button>
                <Button size="sm" onClick={() => setDialog({ kind: 'create', parent: null })}>
                  <Plus className="size-4" /> {t('tree.addRoot')}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Authoring is feature-gated per tenant (admin can override) */}
      {!canAuthor && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-300/40 bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
          <p className="text-sm text-brand-700 dark:text-brand-300">{t('tree.authoringOff')}</p>
          <Link
            to="/billing"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-brand-400"
          >
            {t('credits.upgradeCta')}
          </Link>
        </div>
      )}

      {/* Language pills + edit/preview switch */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <LangPill
            active={language === undefined}
            onClick={() => setLanguage(undefined)}
            label={`${t('tree.canonical')}${canonical ? ` · ${canonical}` : ''}`}
          />
          {(languages.data ?? [])
            .filter((l) => l.code !== canonical)
            .map((l) => (
              <LangPill
                key={l.code}
                active={language === l.code}
                onClick={() => setLanguage(l.code)}
                label={l.name}
              />
            ))}
        </div>
        <div className="inline-flex gap-1 rounded-lg border border-border bg-surface2 p-1">
          {(
            [
              ['edit', Pencil, 'tree.mode.edit'],
              ['preview', Eye, 'tree.mode.preview'],
            ] as const
          ).map(([m, Icon, key]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === m ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
              )}
            >
              <Icon className="size-3.5" /> {t(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Mirror-language notice: content is generated async from the canonical tree */}
      {viewingMirror && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-steel-500/30 bg-steel-500/5 px-4 py-2.5 text-sm text-steel-600 dark:text-steel-300">
          <Languages className="size-4 shrink-0" />
          {t('tree.mirrorNote', { lang: data.language, canonical: data.canonical_language })}
        </div>
      )}

      {retranslate.isSuccess && (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/5 px-4 py-2.5 text-sm text-success">
          {t('tree.retranslate.started')}
        </div>
      )}

      {treeQuery.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-7" />
        </div>
      ) : treeQuery.isError ? (
        <Card className="flex items-center gap-3 p-6 text-sm text-danger">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="font-medium">{t('tree.loadError')}</p>
            <p className="text-muted">{getApiErrorMessage(treeQuery.error)}</p>
          </div>
        </Card>
      ) : tree.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTree}
            title={t('tree.empty.title')}
            description={t('tree.empty.desc')}
            action={
              canAuthor ? (
                <Button onClick={() => setDialog({ kind: 'create', parent: null })}>
                  <Plus className="size-4" /> {t('tree.addRoot')}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : mode === 'edit' ? (
        <Card className="p-3 sm:p-4">
          <ul className="flex flex-col gap-1">
            {tree.map((node) => (
              <NodeRow
                key={node.id}
                node={node}
                depth={0}
                readOnly={!canAuthor}
                onAddChild={(n) => setDialog({ kind: 'create', parent: n })}
                onEdit={(n) => setDialog({ kind: 'edit', node: n })}
                onDelete={setToDelete}
              />
            ))}
          </ul>
        </Card>
      ) : (
        <GuidedPreview tree={tree} rtl={dir === 'rtl'} />
      )}

      <NodeDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onSaved={() => {
          void invalidateTree()
          setDialog(null)
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={t('tree.delete.title')}
        message={t('tree.delete.message', { title: toDelete?.title ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
      {isAdmin && (
        <LanguageManager
          open={langManagerOpen}
          canonical={canonical}
          onClose={() => setLangManagerOpen(false)}
        />
      )}
    </div>
  )
}

function LangPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-400/60 bg-brand-500/10 text-brand-700 dark:text-brand-300'
          : 'border-border bg-surface text-muted hover:text-fg',
      )}
    >
      {label}
    </button>
  )
}

/* ------------------------------------------------------------ edit view */

function NodeRow({
  node,
  depth,
  readOnly,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: GuidedTreeNode
  depth: number
  readOnly?: boolean
  onAddChild: (n: GuidedTreeNode) => void
  onEdit: (n: GuidedTreeNode) => void
  onDelete: (n: GuidedTreeNode) => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface2/70"
        style={{ paddingInlineStart: `${depth * 1.5 + 0.5}rem` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'rounded p-0.5 text-faint hover:text-fg',
            !hasChildren && 'invisible',
          )}
          aria-label={expanded ? t('tree.collapse') : t('tree.expand')}
        >
          <ChevronDown
            className={cn('size-4 transition-transform', !expanded && 'ltr:-rotate-90 rtl:rotate-90')}
          />
        </button>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{node.title}</span>
          {node.answer && (
            <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
              <MessageSquareText className="size-3 shrink-0 text-steel-500" />
              <span className="truncate">{node.answer}</span>
            </span>
          )}
        </span>

        {hasChildren && (
          <Badge tone="neutral">{node.children.length}</Badge>
        )}

        {!readOnly && (
          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <RowAction label={t('tree.addChild')} onClick={() => onAddChild(node)}>
              <Plus className="size-4" />
            </RowAction>
            <RowAction label={t('common.edit')} onClick={() => onEdit(node)}>
              <Pencil className="size-4" />
            </RowAction>
            <RowAction
              label={t('common.delete')}
              onClick={() => onDelete(node)}
              className="text-danger hover:bg-danger/10"
            >
              <Trash2 className="size-4" />
            </RowAction>
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <ul className="flex flex-col gap-0.5 border-s border-border/70 ms-[1.05rem]">
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              readOnly={readOnly}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function RowAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn('rounded-md p-1.5 text-muted transition-colors hover:bg-surface2', className)}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------- preview view */

/** End-user simulation: tap a question → see its answer and drill into children. */
function GuidedPreview({ tree, rtl }: { tree: GuidedTreeNode[]; rtl: boolean }) {
  const { t } = useI18n()
  const [path, setPath] = useState<GuidedTreeNode[]>([])

  const current = path[path.length - 1] ?? null
  const options = current ? current.children : tree
  const BackIcon = rtl ? ChevronRight : ChevronLeft

  return (
    <Card className="mx-auto max-w-xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-surface2/60 px-4 py-3">
        {path.length > 0 ? (
          <button
            onClick={() => setPath((p) => p.slice(0, -1))}
            className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-fg"
            aria-label={t('common.back')}
          >
            <BackIcon className="size-4" />
          </button>
        ) : (
          <ListTree className="ms-1.5 size-4 text-brand-500" />
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
          {current ? current.title : t('tree.preview.root')}
        </p>
        {path.length > 0 && (
          <button
            onClick={() => setPath([])}
            className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-fg"
            aria-label={t('tree.preview.restart')}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 p-5">
        {current?.answer && (
          <div className="animate-msg-in rounded-2xl rounded-ss-md border border-border bg-surface2 px-4 py-3 text-sm leading-relaxed text-fg">
            {current.answer}
          </div>
        )}

        {options.length > 0 ? (
          <div className="flex flex-col gap-2">
            {options.map((o, i) => (
              <button
                key={o.id}
                onClick={() => setPath((p) => [...p, o])}
                className="animate-msg-in flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start text-sm font-medium text-fg transition-colors hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="min-w-0 truncate">{o.title}</span>
                <ChevronRight className="size-4 shrink-0 text-faint rtl:rotate-180" />
              </button>
            ))}
          </div>
        ) : (
          !current?.answer && (
            <p className="py-6 text-center text-sm text-muted">{t('tree.preview.leafEmpty')}</p>
          )
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------- dialogs */

function NodeDialog({
  dialog,
  onClose,
  onSaved,
}: {
  dialog:
    | { kind: 'create'; parent: GuidedTreeNode | null }
    | { kind: 'edit'; node: GuidedTreeNode }
    | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const editing = dialog?.kind === 'edit' ? dialog.node : null
  const parent = dialog?.kind === 'create' ? dialog.parent : null

  const [title, setTitle] = useState('')
  const [answer, setAnswer] = useState('')
  const [order, setOrder] = useState('')
  // Sync fields when a different dialog opens (render-time state sync, no effect).
  const [seed, setSeed] = useState<string | null>(null)
  const dialogKey = dialog ? (editing ? `e:${editing.id}` : `c:${parent?.id ?? 'root'}`) : null
  if (dialogKey !== seed) {
    setSeed(dialogKey)
    setTitle(editing?.title ?? '')
    setAnswer(editing?.answer ?? '')
    setOrder(editing ? String(editing.order) : '')
  }

  const save = useMutation({
    mutationFn: () => {
      const orderNum = order.trim() === '' ? undefined : Number(order)
      if (editing) {
        return guidedTreeApi.update(editing.id, {
          title: title.trim(),
          answer: answer.trim(),
          ...(orderNum != null && !Number.isNaN(orderNum) ? { order: orderNum } : {}),
        })
      }
      return guidedTreeApi.create({
        title: title.trim(),
        answer: answer.trim() || undefined,
        parent: parent?.id ?? undefined,
        ...(orderNum != null && !Number.isNaN(orderNum) ? { order: orderNum } : {}),
      })
    },
    onSuccess: onSaved,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (title.trim()) save.mutate()
  }

  function handleClose() {
    save.reset()
    onClose()
  }

  return (
    <Modal
      open={!!dialog}
      onClose={handleClose}
      title={
        editing
          ? t('tree.dialog.editTitle')
          : parent
            ? t('tree.dialog.addChildTitle', { title: parent.title })
            : t('tree.dialog.addRootTitle')
      }
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="tree-node-form" loading={save.isPending} disabled={!title.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="tree-node-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('tree.f.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          dir="auto"
        />
        <Textarea
          label={t('tree.f.answer')}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          hint={t('tree.f.answerHint')}
        />
        <Input
          label={t('tree.f.order')}
          type="number"
          min={0}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          hint={t('tree.f.orderHint')}
        />
        <p className="rounded-lg bg-surface2 px-3 py-2 text-xs text-muted">
          {t('tree.dialog.canonicalNote')}
        </p>
        {save.isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(save.error)}
          </div>
        )}
      </form>
    </Modal>
  )
}

/** Admin: add/remove mirror languages. Deleting the canonical is refused (400). */
function LanguageManager({
  open,
  canonical,
  onClose,
}: {
  open: boolean
  canonical?: string
  onClose: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const languages = useQuery({
    queryKey: ['tree-languages', 'all'],
    queryFn: () => treeLanguagesApi.list(false),
    enabled: open,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['tree-languages'] })
    void queryClient.invalidateQueries({ queryKey: ['guided-tree'] })
  }

  const add = useMutation({
    mutationFn: () => treeLanguagesApi.create(code.trim().toLowerCase(), name.trim()),
    onSuccess: () => {
      invalidate()
      setCode('')
      setName('')
    },
  })
  const remove = useMutation({
    mutationFn: (c: string) => treeLanguagesApi.remove(c),
    onSuccess: invalidate,
  })

  return (
    <Modal open={open} onClose={onClose} title={t('tree.languages.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t('tree.languages.desc')}</p>

        {languages.isLoading ? (
          <Spinner className="mx-auto" />
        ) : (
          <ul className="flex flex-col gap-2">
            {(languages.data ?? []).map((l) => (
              <li
                key={l.code}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface2/60 px-3.5 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <code className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-xs text-fg">
                    <bdi dir="ltr">{l.code}</bdi>
                  </code>
                  <span className="truncate text-sm font-medium text-fg">{l.name}</span>
                  {l.code === canonical && <Badge tone="brand">{t('tree.canonicalBadge')}</Badge>}
                  {!l.is_active && <Badge tone="neutral">{t('common.inactive')}</Badge>}
                </span>
                {l.code !== canonical && (
                  <button
                    onClick={() => remove.mutate(l.code)}
                    disabled={remove.isPending}
                    className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim() && name.trim()) add.mutate()
          }}
          className="flex items-end gap-2 border-t border-border pt-4"
        >
          <div className="w-24">
            <Input
              label={t('tree.languages.code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="en"
              dir="ltr"
              maxLength={8}
            />
          </div>
          <div className="flex-1">
            <Input
              label={t('tree.languages.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tree.languages.namePlaceholder')}
            />
          </div>
          <Button type="submit" loading={add.isPending} disabled={!code.trim() || !name.trim()}>
            <Plus className="size-4" /> {t('common.add')}
          </Button>
        </form>
        {(add.isError || remove.isError) && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {getApiErrorMessage(add.isError ? add.error : remove.error)}
          </div>
        )}
      </div>
    </Modal>
  )
}
