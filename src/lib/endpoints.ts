/**
 * Typed endpoint functions, grouped by API area. Each returns parsed data.
 * Paths are relative to the API root (/api/v1/...) per api-docs.html.
 */
import { getApiErrorStatus, http } from './api'
import type {
  AddCreditsRequest,
  ApiKey,
  AssignSubscriptionRequest,
  ChatbotConfig,
  CreatedUser,
  EmailVerificationStatus,
  ChatFeedbackRequest,
  ChatRequest,
  ChatResponse,
  Document,
  DocumentContent,
  SourcePage,
  FeatureCatalogItem,
  FeatureOverrides,
  BulkKnowledgeResult,
  FullKnowledge,
  MyFeatures,
  UserFeatures,
  GuidedNodeInput,
  GuidedTreeNode,
  GuidedTreeResponse,
  KnowledgeChunk,
  KnowledgeSources,
  FullKnowledgeDocument,
  BulkKnowledgeStatus,
  ListParams,
  MySubscription,
  Paginated,
  Plan,
  PlanInput,
  Subscription,
  ApiIngestionRun,
  SyncApiContentRequest,
  SyncApiContentResponse,
  TokenPair,
  TreeLanguage,
  UnansweredQuestion,
  UnansweredStatus,
  UsageReport,
  User,
  WhatsAppAccount,
  WhatsAppAccountInput,
  WhatsAppAnalyticsRow,
  WhatsAppContact,
  WhatsAppMessage,
  WhatsAppSendRequest,
  WhatsAppSendResponse,
  WhatsAppSession,
} from '@/types/api'

const V1 = '/api/v1'

/**
 * Some "list" endpoints return a bare array, others the DRF paginated shape
 * ({count, results}) or a wrapper object — normalize all of them to an array.
 */
function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(v)) return v as T[]
    }
  }
  return []
}

export const authApi = {
  login: (username: string, password: string) =>
    http.post<TokenPair>(`${V1}/auth/login/`, { username, password }),
  verify: (token: string) => http.post<void>(`${V1}/auth/verify/`, { token }),
  /** Activate a new account from the emailed link (public). */
  verifyEmail: (uid: string, token: string) =>
    http.post<{ detail?: string }>(`${V1}/auth/verify-email/`, { uid, token }),
  /** Public self-signup — creates an inactive account and emails an activation link. */
  register: (body: {
    username: string
    email: string
    first_name?: string
    last_name?: string
    password: string
    password_confirm: string
  }) =>
    http.post<{ detail?: string; username?: string; email?: string; email_verification?: EmailVerificationStatus }>(
      `${V1}/auth/register/`,
      body,
    ),
}

export const usersApi = {
  me: () => http.get<User>(`${V1}/users/me/`),
  /** Edit own name / username (email is changed via the verified flow). */
  updateMe: (body: Partial<Pick<User, 'first_name' | 'last_name' | 'username'>>) =>
    http.patch<User>(`${V1}/users/me/`, body),
  /** Step 1 of a password change — emails a 6-digit confirmation code. */
  requestPasswordCode: () =>
    http.post<{ detail?: string }>(`${V1}/users/request-password-code/`),
  /** Step 2 — change the password with the current password + emailed code. */
  changePassword: (body: {
    old_password: string
    new_password: string
    new_password_confirm: string
    code: string
  }) => http.post<{ detail: string }>(`${V1}/users/change-password/`, body),
  /** Step 1 of email change — sends a 6-digit code to the new address. */
  changeEmail: (new_email: string) =>
    http.post<{ detail: string }>(`${V1}/users/change-email/`, { new_email }),
  /** Step 2 — confirm the code; returns the updated user. */
  verifyEmail: (code: string) => http.post<User>(`${V1}/users/verify-email/`, { code }),
  myApiKey: () => http.get<ApiKey>(`${V1}/users/api-key/`),
  regenerateMyApiKey: () => http.post<ApiKey>(`${V1}/users/regenerate-api-key/`),

  // Admin (is_staff)
  list: (params?: ListParams) => http.get<Paginated<User>>(`${V1}/users/`, { params }),
  retrieve: (id: string) => http.get<User>(`${V1}/users/${id}/`),
  create: (body: {
    username: string
    email: string
    first_name?: string
    last_name?: string
    password: string
    password_confirm: string
  }) => http.post<CreatedUser>(`${V1}/users/`, body),
  update: (id: string, body: Partial<User>) => http.patch<User>(`${V1}/users/${id}/`, body),
  remove: (id: string) => http.delete<void>(`${V1}/users/${id}/`),
  setPassword: (id: string, new_password: string) =>
    http.post<{ detail: string }>(`${V1}/users/${id}/set-password/`, { new_password }),
  /** Re-send the activation link to an inactive user (admin). */
  resendActivation: (id: string) =>
    http.post<{ detail?: string }>(`${V1}/users/${id}/resend-activation/`),
}

export const apiKeysApi = {
  list: (params?: ListParams) => http.get<Paginated<ApiKey>>(`${V1}/api-keys/`, { params }),
  issue: (user: string) => http.post<ApiKey>(`${V1}/api-keys/`, { user }),
  retrieve: (id: string) => http.get<ApiKey>(`${V1}/api-keys/${id}/`),
  remove: (id: string) => http.delete<void>(`${V1}/api-keys/${id}/`),
  revoke: (id: string) => http.post<ApiKey>(`${V1}/api-keys/${id}/revoke/`),
  activate: (id: string) => http.post<ApiKey>(`${V1}/api-keys/${id}/activate/`),
  regenerate: (id: string) => http.post<ApiKey>(`${V1}/api-keys/${id}/regenerate/`),
}

/**
 * GET/PUT /knowledge/sources/{id}/ answers with the page (a `document` object,
 * its `content`, and the sections it was built from). The screens here want one
 * flat record per source, so it is flattened once, here, rather than in each of
 * them. `section_count` is the number of pieces the text was chunked into --
 * what `chunk_count` has always meant on this side.
 */
function asDocumentContent(page: SourcePage): DocumentContent {
  return {
    id: page.document.id,
    filename: page.document.filename,
    source_type: page.document.source_type,
    processing_status: page.document.processing_status,
    chunk_count: page.section_count,
    chunks_created: page.section_count,
    char_count: page.char_count,
    content: page.content,
  }
}

export const documentsApi = {
  list: (params?: ListParams) => http.get<Paginated<Document>>(`${V1}/documents/`, { params }),
  retrieve: (id: string) => http.get<Document>(`${V1}/documents/${id}/`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('is_active', 'true') // uploaded documents are active by default
    return http.post<Document>(`${V1}/documents/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadWord: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('is_active', 'true')
    return http.post<Document & { chunks_created: number }>(
      `${V1}/documents/upload-word/`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
  update: (id: string, body: Partial<Pick<Document, 'is_active'>>) =>
    http.patch<Document>(`${V1}/documents/${id}/`, body),
  remove: (id: string) => http.delete<void>(`${V1}/documents/${id}/`),
  reindex: (id: string) => http.post<Document>(`${V1}/documents/${id}/reindex/`),
  /**
   * A source's whole text, the chunker's repeats already removed by the server
   * (FRONTEND_API.md §5e). The page is served under /knowledge/, not under the
   * document, because it is the *knowledge* the document produced.
   */
  content: (id: string) => http.get<SourcePage>(`${V1}/knowledge/sources/${id}/`).then(asDocumentContent),
  /** Replace a source's whole text — re-chunked + re-embedded (400 empty/>1M chars/API source, 503 embed down). */
  setContent: (id: string, content: string) =>
    http.put<SourcePage>(`${V1}/knowledge/sources/${id}/`, { content }).then(asDocumentContent),
}

export const syncApi = {
  /**
   * Start an import. Answers 202 with a `run_id` in production -- a full import
   * runs one LLM call per record, far longer than any gateway holds a
   * connection -- so the caller polls `run()`'s id with `runStatus`. A server
   * configured to import in-request answers 200 with the finished report
   * instead; `isQueuedSync` tells the two apart.
   */
  run: (body: SyncApiContentRequest) =>
    http.post<SyncApiContentResponse>(`${V1}/sync-api-content/`, body),
  /** Progress of a running import; poll until `done` (FRONTEND_API.md §5a). */
  runStatus: (runId: string) =>
    http.get<ApiIngestionRun>(`${V1}/sync-api-content/runs/${runId}/`),
}

export const featuresApi = {
  /** Controllable features, for rendering toggles (any authenticated user). */
  catalog: () =>
    http.get<unknown>(`${V1}/feature-catalog/`).then((d) => asList<FeatureCatalogItem>(d)),
  /** The caller's own resolved features — use to show/hide UI. */
  mine: () => http.get<MyFeatures>(`${V1}/my-features/`),
  /** Admin: a user's resolved features + raw overrides. */
  forUser: (userId: string) => http.get<UserFeatures>(`${V1}/user-features/${userId}/`),
  /** Admin: force features on/off (true/false) or clear an override (null). */
  setOverrides: (userId: string, overrides: FeatureOverrides) =>
    http.patch<UserFeatures>(`${V1}/user-features/${userId}/`, { overrides }),
}

export const guidedTreeApi = {
  /** Read the nested tree; omit language for the canonical one. Cached ~5 min server-side. */
  tree: (language?: string) =>
    http.get<GuidedTreeResponse>(`${V1}/guided-tree/`, {
      params: language ? { language } : undefined,
    }),
  /** Writes always hit the canonical language; mirrors regenerate async. */
  create: (body: GuidedNodeInput) => http.post<GuidedTreeNode>(`${V1}/guided-tree/`, body),
  update: (id: string, body: Partial<GuidedNodeInput>) =>
    http.patch<GuidedTreeNode>(`${V1}/guided-tree/${id}/`, body),
  /** Removes the node (and its mirrors in every language). */
  remove: (id: string) => http.delete<void>(`${V1}/guided-tree/${id}/`),
  /** Rebuild one (or all) mirror languages → 202. */
  retranslate: (language?: string) =>
    http.post<{ detail?: string }>(
      `${V1}/guided-tree/retranslate/`,
      language ? { language } : {},
    ),
}

export const treeLanguagesApi = {
  list: (activeOnly = false) =>
    http
      .get<unknown>(`${V1}/tree-languages/`, {
        params: activeOnly ? { active: 1 } : undefined,
      })
      .then((d) => asList<TreeLanguage>(d)),
  /** Admin — registers a language and generates its mirror. */
  create: (code: string, name: string) =>
    http.post<TreeLanguage>(`${V1}/tree-languages/`, { code, name }),
  /** Admin — cannot delete the canonical language (400). */
  remove: (code: string) => http.delete<void>(`${V1}/tree-languages/${code}/`),
}

/**
 * GET /knowledge/sources/ groups the sources by where their knowledge came
 * from (file / api / website) and always sends all three keys. The screens here
 * want one flat list, newest first.
 */
export const knowledgeSourcesApi = {
  list: () =>
    http.get<KnowledgeSources>(`${V1}/knowledge/sources/`).then((d) => [
      ...(d.sources?.file ?? []),
      ...(d.sources?.api ?? []),
      ...(d.sources?.website ?? []),
    ]),
  /** Forget a source and everything it taught the bot. */
  remove: (id: string) => http.delete<void>(`${V1}/knowledge/sources/${id}/`),
}

/**
 * Which per-source failure the page should show. The API distinguishes them by
 * status: 404 is gone or not yours, 503 is the embedding provider being down
 * (nothing was changed), and 400 is the text itself — empty, too large, or a
 * source an API sync owns.
 */
function bulkStatusFor(err: unknown): BulkKnowledgeStatus {
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 404) return 'not_found'
  if (status === 503) return 'unavailable'
  return 'error'
}

/**
 * The source list, or [] when the tenant genuinely has no knowledge.
 *
 * An API that predates GET /knowledge/sources/ answers it with 404: the path
 * falls through to /knowledge/{id}/ with id="sources". Shown as-is, an empty
 * knowledge base read as "couldn't load". But a 404 is not proof of emptiness,
 * so it is checked against the chunk list, which every API version serves:
 * no chunks means nothing to show. Chunks without the sources endpoint means
 * there IS content this page cannot open, and the original error stands rather
 * than a false "empty".
 */
async function listSourcesOrEmpty() {
  try {
    return await knowledgeSourcesApi.list()
  } catch (err) {
    if (getApiErrorStatus(err) !== 404) throw err
    const { count } = await chunksApi.list({ page_size: 1 })
    if (count === 0) return []
    throw err
  }
}

export const chunksApi = {
  /** Search/list every knowledge chunk (filters: document, search, ordering=position|-updated_at). */
  list: (params?: ListParams) => http.get<Paginated<KnowledgeChunk>>(`${V1}/knowledge/`, { params }),
  /** A single document’s chunks in reading order. */
  forDocument: (documentId: string, params?: ListParams) =>
    http.get<Paginated<KnowledgeChunk>>(`${V1}/knowledge/`, {
      params: { ...params, document: documentId, ordering: 'position' },
    }),
  retrieve: (id: string) => http.get<KnowledgeChunk>(`${V1}/knowledge/${id}/`),
  /** Only `content` is editable; the chunk is re-embedded automatically (400 empty, 503 embed down). */
  update: (id: string, content: string) =>
    http.patch<KnowledgeChunk>(`${V1}/knowledge/${id}/`, { content }),
  /** Removes that one piece of knowledge. */
  remove: (id: string) => http.delete<void>(`${V1}/knowledge/${id}/`),
  /**
   * Save every edited source. The API saves one source per request (there is no
   * batch endpoint), so this fans out and reports a result per source the way
   * the page expects — one failure never hides the saves that did land.
   */
  bulkUpdate: async (
    documents: Array<{ id: string; content: string }>,
  ): Promise<BulkKnowledgeResult> => {
    const results = await Promise.all(
      documents.map(async ({ id, content }) => {
        try {
          const saved = await documentsApi.setContent(id, content)
          return { id, status: 'updated' as const, chunk_count: saved.chunk_count }
        } catch (err) {
          return { id, status: bulkStatusFor(err) }
        }
      }),
    )
    return {
      updated: results.filter((r) => r.status === 'updated').length,
      total: results.length,
      results,
    }
  },
  /**
   * The whole knowledge base, one full text per source. The API serves the list
   * of sources and each source's text separately, so this composes the two: one
   * request for the list, then one per source (skipped when a single source is
   * asked for).
   */
  full: async (documentId?: string): Promise<FullKnowledge> => {
    const ids = documentId ? [documentId] : (await listSourcesOrEmpty()).map((s) => s.id)
    const settled = await Promise.all(
      ids.map((id) =>
        documentsApi
          .content(id)
          .then((doc) => doc)
          // A source deleted between the list and its fetch is not an error.
          .catch(() => null),
      ),
    )
    const documents: FullKnowledgeDocument[] = settled
      .filter((d): d is DocumentContent => d !== null)
      .map((d) => ({
        id: d.id,
        filename: d.filename,
        source_type: d.source_type,
        chunk_count: d.chunk_count,
        char_count: d.char_count,
        content: d.content,
      }))
    return {
      document_count: documents.length,
      chunk_count: documents.reduce((n, d) => n + d.chunk_count, 0),
      char_count: documents.reduce((n, d) => n + d.char_count, 0),
      documents,
    }
  },
}

export const configApi = {
  get: () => http.get<ChatbotConfig>(`${V1}/chatbot-config/`),
  update: (body: Partial<ChatbotConfig>) =>
    http.patch<ChatbotConfig>(`${V1}/chatbot-config/`, body),
}

export const chatApi = {
  send: (body: ChatRequest) => http.post<ChatResponse>(`${V1}/chat/`, body),
  feedback: (body: ChatFeedbackRequest) => http.post(`${V1}/chat/feedback/`, body),
}

export const analyticsApi = {
  usage: () => http.get<UsageReport>(`${V1}/analytics/usage/`),
  usageAll: () =>
    http.get<{ tenants: UsageReport[] }>(`${V1}/analytics/usage/`, { params: { scope: 'all' } }),
}

export const unansweredApi = {
  list: (params?: ListParams) =>
    http.get<Paginated<UnansweredQuestion>>(`${V1}/unanswered/`, { params }),
  retrieve: (id: string) => http.get<UnansweredQuestion>(`${V1}/unanswered/${id}/`),
  /** Re-triage — only `status` is writable. */
  setStatus: (id: string, status: UnansweredStatus) =>
    http.patch<UnansweredQuestion>(`${V1}/unanswered/${id}/`, { status }),
  /** Provide an answer to embed into the tenant's knowledge (empty = just mark answered). */
  resolve: (id: string, answer?: string) =>
    http.post<UnansweredQuestion>(
      `${V1}/unanswered/${id}/resolve/`,
      answer && answer.trim() ? { answer: answer.trim() } : {},
    ),
  dismiss: (id: string) =>
    http.post<UnansweredQuestion>(`${V1}/unanswered/${id}/dismiss/`),
  remove: (id: string) => http.delete<void>(`${V1}/unanswered/${id}/`),
}

export const whatsappApi = {
  send: (body: WhatsAppSendRequest) =>
    http.post<WhatsAppSendResponse>(`${V1}/whatsapp/send/`, body),

  // Read-only data viewsets
  messages: (params?: ListParams) =>
    http.get<Paginated<WhatsAppMessage>>(`${V1}/whatsapp/messages/`, { params }),
  contacts: (params?: ListParams) =>
    http.get<Paginated<WhatsAppContact>>(`${V1}/whatsapp/users/`, { params }),
  sessions: (params?: ListParams) =>
    http.get<Paginated<WhatsAppSession>>(`${V1}/whatsapp/sessions/`, { params }),
  analytics: (params?: ListParams) =>
    http.get<Paginated<WhatsAppAnalyticsRow>>(`${V1}/whatsapp/analytics/`, { params }),

  // Accounts control plane (admin)
  accounts: {
    list: (params?: ListParams) =>
      http.get<Paginated<WhatsAppAccount>>(`${V1}/whatsapp/accounts/`, { params }),
    create: (body: WhatsAppAccountInput) =>
      http.post<WhatsAppAccount>(`${V1}/whatsapp/accounts/`, body),
    update: (id: string, body: Partial<WhatsAppAccountInput> & { is_active?: boolean }) =>
      http.patch<WhatsAppAccount>(`${V1}/whatsapp/accounts/${id}/`, body),
    remove: (id: string) => http.delete<void>(`${V1}/whatsapp/accounts/${id}/`),
  },
}

export const plansApi = {
  list: (params?: ListParams) => http.get<Paginated<Plan>>(`${V1}/plans/`, { params }),
  retrieve: (id: string) => http.get<Plan>(`${V1}/plans/${id}/`),
  create: (body: PlanInput) => http.post<Plan>(`${V1}/plans/`, body),
  update: (id: string, body: Partial<PlanInput>) => http.patch<Plan>(`${V1}/plans/${id}/`, body),
  remove: (id: string) => http.delete<void>(`${V1}/plans/${id}/`),
}

export const subscriptionsApi = {
  list: (params?: ListParams) =>
    http.get<Paginated<Subscription>>(`${V1}/subscriptions/`, { params }),
  retrieve: (id: string) => http.get<Subscription>(`${V1}/subscriptions/${id}/`),
  assign: (body: AssignSubscriptionRequest) =>
    http.post<Subscription>(`${V1}/subscriptions/`, body),
  /** Admin credit top-up for a tenant. */
  addCredits: (body: AddCreditsRequest) =>
    http.post(`${V1}/subscriptions/add-credits/`, body),
  /** The caller's own plan + credit balance + usage limits. */
  mine: () => http.get<MySubscription>(`${V1}/my-subscription/`),
}
