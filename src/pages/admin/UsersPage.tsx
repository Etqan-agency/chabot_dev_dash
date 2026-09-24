import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MailCheck,
  Power,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CreateUserDialog } from '@/components/admin/CreateUserDialog'
import { SetPasswordDialog } from '@/components/admin/SetPasswordDialog'
import { UserFeaturesDialog } from '@/components/admin/UserFeaturesDialog'
import { usersApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/hooks/useI18n'
import { useAuth } from '@/hooks/useAuth'
import type { ListParams, User } from '@/types/api'

export default function UsersPage() {
  const { t, dir } = useI18n()
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [pwUser, setPwUser] = useState<User | null>(null)
  const [featuresUser, setFeaturesUser] = useState<User | null>(null)
  const [toDelete, setToDelete] = useState<User | null>(null)
  const debouncedSearch = useDebounce(search)

  const params: ListParams = {
    page,
    ordering: '-date_joined',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const toggleActive = useMutation({
    mutationFn: (u: User) => usersApi.update(u.id, { is_active: !u.is_active }),
    onSuccess: invalidate,
  })
  const resendActivation = useMutation({
    mutationFn: (id: string) => usersApi.resendActivation(id),
  })
  const remove = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      void invalidate()
      setToDelete(null)
    },
  })

  const users = data?.results ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  /**
   * Why this user cannot be deleted, or null when they can be. The API refuses
   * both cases with 400 (FRONTEND_API.md §11): deleting cascades through a
   * tenant's documents, knowledge, key and subscription with no undo, and
   * neither an admin deleting themselves nor an admin deleting the last other
   * admin can be put right from inside the product afterwards.
   */
  function deleteBlockedReason(u: User): string | null {
    if (me && u.id === me.id) return t('admin.users.action.delete.blockedSelf')
    if (u.role === 'admin') return t('admin.users.action.delete.blockedAdmin')
    return null
  }

  function fullName(u: User) {
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
  }

  return (
    <div>
      <PageHeader
        title={t('admin.users.title')}
        description={t('admin.users.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" /> {t('admin.users.create')}
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          placeholder={t('admin.users.search')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="ps-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="size-7" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-6 text-sm text-danger">
            <AlertTriangle className="size-5 shrink-0" />
            <div>
              <p className="font-medium">{t('admin.users.loadError')}</p>
              <p className="text-muted">{getApiErrorMessage(error)}</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('admin.users.empty.title')}
            description={t('admin.users.empty.desc')}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <UserPlus className="size-4" /> {t('admin.users.create')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.users.col.user')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.users.col.role')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.users.col.status')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('admin.users.col.joined')}</th>
                  <th className="px-5 py-3 text-end font-semibold">{t('admin.users.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface2/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-navy-900">
                          {(u.username.slice(0, 2) || '').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{fullName(u)}</p>
                          <p className="truncate text-xs text-muted">
                            <bdi dir="ltr">
                              @{u.username} · {u.email}
                            </bdi>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>
                        {u.role === 'admin' ? t('admin.role.admin') : t('admin.role.user')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.is_active ? 'success' : 'neutral'} dot>
                        {u.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatDate(u.date_joined)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!u.is_active && (
                          <IconAction
                            label={t('admin.users.action.resendActivation')}
                            onClick={() => resendActivation.mutate(u.id)}
                            busy={resendActivation.isPending && resendActivation.variables === u.id}
                            className="text-steel-500 hover:bg-steel-500/10"
                          >
                            <MailCheck className="size-4" />
                          </IconAction>
                        )}
                        <IconAction
                          label={t('admin.users.action.features')}
                          onClick={() => setFeaturesUser(u)}
                          className="text-steel-500 hover:bg-steel-500/10"
                        >
                          <SlidersHorizontal className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t('admin.users.action.setPassword')}
                          onClick={() => setPwUser(u)}
                        >
                          <KeyRound className="size-4" />
                        </IconAction>
                        <IconAction
                          label={
                            u.role === 'admin' && u.is_active
                              ? t('admin.users.action.deactivate.blocked')
                              : u.is_active
                                ? t('admin.users.action.deactivate')
                                : t('admin.users.action.activate')
                          }
                          onClick={() => toggleActive.mutate(u)}
                          // The API refuses to deactivate an admin: nobody could
                          // grant the role back, so the last one in would be out.
                          disabled={u.role === 'admin' && u.is_active}
                          busy={toggleActive.isPending && toggleActive.variables?.id === u.id}
                          className={u.is_active ? 'text-success' : 'text-faint'}
                        >
                          <Power className="size-4" />
                        </IconAction>
                        <IconAction
                          label={deleteBlockedReason(u) ?? t('admin.users.action.delete')}
                          onClick={() => setToDelete(u)}
                          // Deleting cascades and cannot be undone, and the API
                          // refuses both of these outright (400) -- so the button
                          // says why instead of failing after the confirmation.
                          disabled={deleteBlockedReason(u) !== null}
                          className="text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="size-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && users.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
            <span className="flex items-center gap-2">
              {total}
              {isFetching && <RefreshCw className="size-3.5 animate-spin text-faint" />}
            </span>
            <div className="flex items-center gap-2">
              <span>
                {t('common.page')} {page} {t('common.of')} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.previous}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <PrevIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.next}
                onClick={() => setPage((p) => p + 1)}
              >
                <NextIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <SetPasswordDialog user={pwUser} onClose={() => setPwUser(null)} />
      <UserFeaturesDialog user={featuresUser} onClose={() => setFeaturesUser(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title={t('admin.users.delete.title')}
        message={t('admin.users.delete.message', { name: toDelete ? fullName(toDelete) : '' })}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function IconAction({
  label,
  onClick,
  busy,
  disabled,
  className,
  children,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  /** Not allowed at all — `label` should then say why, since it is the tooltip. */
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        'rounded-lg p-2 text-muted transition-colors hover:bg-surface2 disabled:opacity-50',
        // A refused action should not also look clickable on the way past.
        disabled && 'cursor-not-allowed hover:bg-transparent',
        className,
      )}
    >
      {busy ? <RefreshCw className="size-4 animate-spin" /> : children}
    </button>
  )
}
