/**
 * Typed endpoint functions, grouped by API area. Each returns parsed data.
 * Paths are relative to the API root (/api/v1/...) per api-docs.html.
 */
import { http } from './api'
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
  ListParams,
  MySubscription,
  Paginated,
  Plan,
  PlanInput,
  Subscription,
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
  /** Full reconstructed text (all chunks joined, read-only; may repeat a few words at chunk seams). */
  content: (id: string) => http.get<DocumentContent>(`${V1}/documents/${id}/content/`),
  /** Replace a source's whole text — re-chunked + re-embedded (400 empty/>1M chars, 503 embed down). */
  setContent: (id: string, content: string) =>
    http.put<DocumentContent>(`${V1}/documents/${id}/content/`, { content }),
}

export const syncApi = {
  run: (body: SyncApiContentRequest) =>
    http.post<SyncApiContentResponse>(`${V1}/sync-api-content/`, body),
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

export const chunksApi = {
  /** Search/list every knowledge chunk (filters: document, search, ordering=position|-updated_at). */
  list: (params?: ListParams) =>
    http.get<Paginated<KnowledgeChunk>>(`${V1}/knowledge-chunks/`, { params }),
  /** A single document’s chunks in reading order. */
  forDocument: (documentId: string, params?: ListParams) =>
    http.get<Paginated<KnowledgeChunk>>(`${V1}/documents/${documentId}/chunks/`, { params }),
  retrieve: (id: string) => http.get<KnowledgeChunk>(`${V1}/knowledge-chunks/${id}/`),
  /** Only `content` is editable; the chunk is re-embedded automatically (400 empty, 503 embed down). */
  update: (id: string, content: string) =>
    http.patch<KnowledgeChunk>(`${V1}/knowledge-chunks/${id}/`, { content }),
  /** Removes that one piece of knowledge. */
  remove: (id: string) => http.delete<void>(`${V1}/knowledge-chunks/${id}/`),
  /** Bulk edit: each listed document is re-chunked + re-embedded. Max 25 docs/request, each ≤ ~1 MB. */
  bulkUpdate: (documents: Array<{ id: string; content: string }>) =>
    http.patch<BulkKnowledgeResult>(`${V1}/knowledge-chunks/full/`, { documents }),
  /** Entire knowledge base in ONE response — every document with its full joined text (optional ?document=). */
  full: (documentId?: string) =>
    http.get<FullKnowledge>(`${V1}/knowledge-chunks/full/`, {
      params: documentId ? { document: documentId } : undefined,
    }),
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
