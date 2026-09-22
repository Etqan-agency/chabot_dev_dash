import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import { configApi } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api'
import { useI18n } from '@/hooks/useI18n'
import type { ChatbotConfig, ChatbotTone } from '@/types/api'

interface FormState {
  assistant_name: string
  company_name: string
  tone: ChatbotTone
  default_language: string
  no_answer_message: string
}

function toForm(c: ChatbotConfig): FormState {
  return {
    assistant_name: c.assistant_name ?? '',
    company_name: c.company_name ?? '',
    tone: c.tone ?? 'friendly',
    default_language: c.default_language ?? 'auto',
    no_answer_message: c.no_answer_message ?? '',
  }
}

export default function ConfigPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['chatbot-config'],
    queryFn: configApi.get,
  })

  useEffect(() => {
    if (data) setForm(toForm(data))
  }, [data])

  const save = useMutation({
    mutationFn: (body: Partial<ChatbotConfig>) => configApi.update(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['chatbot-config'], updated)
      setForm(toForm(updated))
    },
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    save.reset()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const body: Partial<ChatbotConfig> = {
      assistant_name: form.assistant_name.trim(),
      company_name: form.company_name.trim(),
      tone: form.tone,
      default_language: form.default_language,
      no_answer_message: form.no_answer_message,
    }
    save.mutate(body)
  }

  const toneOptions = [
    { value: 'friendly', label: t('config.tone.friendly') },
    { value: 'formal', label: t('config.tone.formal') },
    { value: 'concise', label: t('config.tone.concise') },
  ]
  const langOptions = [
    { value: 'auto', label: t('config.lang.auto') },
    { value: 'ar', label: t('config.lang.ar') },
    { value: 'en', label: t('config.lang.en') },
  ]
  // Keep an unknown stored language selectable.
  if (form && !langOptions.some((o) => o.value === form.default_language)) {
    langOptions.push({ value: form.default_language, label: form.default_language })
  }

  if (isLoading || !form) {
    return (
      <div>
        <PageHeader title={t('config.title')} description={t('config.subtitle')} />
        {isError ? (
          <Card>
            <CardBody className="flex items-center gap-3 text-sm text-danger">
              <AlertTriangle className="size-5 shrink-0" />
              <div>
                <p className="font-medium">{t('config.loadError')}</p>
                <p className="text-muted">{getApiErrorMessage(error)}</p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="flex items-center justify-center py-24">
            <Spinner className="size-7" />
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader title={t('config.title')} description={t('config.subtitle')} />

      <p className="mb-4 text-sm text-muted">{t('config.zeroNote')}</p>

      <div className="space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader
            title={t('config.section.identity')}
            description={t('config.section.identityDesc')}
          />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t('config.f.assistantName')}
              value={form.assistant_name}
              onChange={(e) => set('assistant_name', e.target.value)}
            />
            <Input
              label={t('config.f.companyName')}
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
            />
            <Field label={t('config.f.tone')}>
              <Select
                options={toneOptions}
                value={form.tone}
                onChange={(e) => set('tone', e.target.value as ChatbotTone)}
              />
            </Field>
            <Field label={t('config.f.language')}>
              <Select
                options={langOptions}
                value={form.default_language}
                onChange={(e) => set('default_language', e.target.value)}
              />
            </Field>
          </CardBody>
        </Card>

        {/* Responses */}
        <Card>
          <CardHeader
            title={t('config.section.responses')}
            description={t('config.section.responsesDesc')}
          />
          <CardBody>
            <Textarea
              label={t('config.f.noAnswer')}
              hint={t('config.f.noAnswerHint')}
              rows={3}
              value={form.no_answer_message}
              onChange={(e) => set('no_answer_message', e.target.value)}
            />
          </CardBody>
        </Card>

        {/* Grounding (read-only) */}
        <div className="flex items-start gap-3 rounded-card border border-border bg-surface2 px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-steel-500" />
          <div>
            <p className="text-sm font-medium text-fg">{t('config.grounding.title')}</p>
            <p className="text-sm text-muted">{t('config.grounding.desc')}</p>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="mt-6 flex items-center justify-end gap-3">
        {save.isError && (
          <span className="me-auto text-sm text-danger">{getApiErrorMessage(save.error)}</span>
        )}
        {save.isSuccess && (
          <span className="me-auto flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" /> {t('config.saved')}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => data && setForm(toForm(data))}
          disabled={save.isPending}
        >
          {t('config.reset')}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-fg">{label}</label>
      {children}
    </div>
  )
}
