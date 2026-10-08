/**
 * TypeScript models for the ChatBot API (v3.1 — multi-tenant RAG).
 * Mirrors the shapes documented in api-docs.html. All ids are UUID strings.
 */

export type UUID = string
export type ISODateString = string

export type UserRole = 'admin' | 'user'

export interface User {
  id: UUID
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  date_joined: ISODateString
  /** False until the user confirms their email via the verify-email step. */
  email_verified?: boolean
  /** Present on the login user and admin user lists. `null` on the free tier (paid feature). */
  api_key?: string | null
}

/** Result of emailing the activation link when an admin creates a user. */
export type EmailVerificationStatus = 'activation_sent' | 'send_failed' | 'not_sent'

/** Response shape from admin user creation (POST /users/). */
export interface CreatedUser extends User {
  api_key: string
  email_verification?: EmailVerificationStatus
}

/** Returned from POST /auth/login/ */
export interface TokenPair {
  access: string
  refresh: string
  user: User
}

/** Returned from POST /auth/refresh/ */
export interface RefreshResponse {
  access: string
  refresh: string
}

export interface ApiKey {
  id: UUID
  user?: UUID
  username?: string
  key: string
  is_active: boolean
  last_used_at: ISODateString | null
  created_at: ISODateString
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type DocumentSourceType = 'file' | 'api' | 'website'

export interface Document {
  id: UUID
  file: string
  filename: string
  file_size: number
  file_size_mb: number
  chunk_count: number
  processing_status: ProcessingStatus
  error_message: string
  is_active: boolean
  source_type: DocumentSourceType
  api_url: string
  items_key: string
  uploaded_by: UUID
  uploaded_by_username: string
  created_at: ISODateString
  updated_at: ISODateString
}

/** A source flattened for the screens here — see `SourcePage` for the wire shape. */
export interface DocumentContent {
  id: UUID
  filename: string
  source_type: DocumentSourceType
  processing_status: ProcessingStatus
  chunk_count: number
  char_count: number
  content: string
  /** Pieces the text was (re-)chunked into on the last save. */
  chunks_created?: number
}

export type ChatbotTone = 'friendly' | 'formal' | 'concise'

export interface ChatbotConfig {
  assistant_name: string
  company_name: string
  default_language: string // "auto" | "ar" | "en" | …
  tone: ChatbotTone
  strict_grounding: boolean
  no_answer_message: string
  top_k: number | null
  similarity_threshold: number | null
  created_at: ISODateString
  updated_at: ISODateString
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  question: string
  history?: ChatMessage[]
  language?: string
}

export interface ChatSource {
  filename: string
  document_id: UUID
  chunk_id: UUID
  position: number
  score: number
}

export interface ChatResponse {
  answer: string
  source: string
  source_id: string
  confident: boolean
  response_time_ms: number
  prompt_tokens: number
  completion_tokens: number
  cost_usd: number
  sources: ChatSource[]
}

export type FeedbackRating = 'up' | 'down'

export interface ChatFeedbackRequest {
  question: string
  answer: string
  source: string
  source_id: string
  rating: FeedbackRating
  comment?: string
}

export interface SyncApiContentRequest {
  api_url: string
  document_name?: string
  items_key?: string
  full_refresh?: boolean
}

/**
 * The finished sync report. Returned directly (200) only when the server
 * imports in-request; in production the import runs on a worker, so this
 * arrives as `result` on the run once it completes (FRONTEND_API.md §5).
 */
export interface SyncApiReport {
  status: string
  run_id?: UUID
  pages_fetched?: number
  truncated?: boolean
  processed?: number
  items_stored?: number
  items_analyzed?: number
  analysis_errors?: number
  items_new?: number
  items_updated?: number
  items_unchanged?: number
  items_removed?: number
  items_protected?: number
  chunks_created?: number
  errors?: number
}

/** POST /sync-api-content/ answering 202: the import is running elsewhere. */
export interface SyncApiQueued {
  status: 'queued'
  run_id: UUID
  /** Path to poll, e.g. /api/v1/sync-api-content/runs/{run_id}/. */
  status_url: string
  detail?: string
}

/**
 * POST /sync-api-content/ answers EITHER shape: 202 queued (the normal case --
 * a full import runs one LLM call per record and takes minutes) or 200 with the
 * finished report on a server configured to import in-request.
 */
export type SyncApiContentResponse = SyncApiQueued | SyncApiReport

export type ApiIngestionStatus =
  | 'queued'
  | 'fetching'
  | 'structuring'
  | 'embedding'
  | 'completed'
  | 'blocked'
  | 'failed'

/** GET /sync-api-content/runs/{run_id}/ — poll until `done` (§5a). */
export interface ApiIngestionRun {
  run_id: UUID
  status: ApiIngestionStatus
  done: boolean
  endpoint?: string
  pages_fetched?: number
  records_fetched?: number
  records_processed?: number
  chunks_created?: number
  field_coverage?: number
  duration_ms?: number
  /** Present once `status` is "completed". */
  result?: SyncApiReport
  /** Why it was blocked or failed. */
  detail?: string
  reason?: string
}

/** True when the POST came back 202 and the import is running elsewhere. */
export function isQueuedSync(r: SyncApiContentResponse): r is SyncApiQueued {
  return 'status_url' in r || r.status === 'queued'
}

export interface UsageTotals {
  requests: number
  tokens_in: number
  tokens_out: number
  total_tokens: number
  cost_usd: number
  avg_response_ms: number
  confident_rate: number
}

export interface QuotaStatus {
  documents_used: number
  max_documents: number
  storage_mb_used: number
  max_total_mb: number
  tokens_this_month: number
  monthly_token_cap: number // 0 = unlimited
  max_requests_per_min: number
  is_suspended: boolean
}

export interface UsageReport {
  tenant: { id: UUID; username: string }
  totals: UsageTotals
  this_month: UsageTotals
  today: UsageTotals
  quota: QuotaStatus
}

/** A subscription plan (admin-managed catalog). */
export interface Plan {
  id: UUID
  name: string
  slug: string
  description?: string
  price_usd: string
  /** Chat questions the plan sells — the pricing metric. Credits & token cap derive from it. */
  questions: number
  included_credits?: number // derived server-side from `questions`
  monthly_questions?: number // legacy alias of `questions`
  monthly_token_cap?: number // derived server-side
  max_documents: number
  max_total_mb: number
  max_requests_per_min?: number
  allow_api_sync?: boolean
  /** Paddle Billing price id — used by the frontend to open Paddle Checkout. */
  paddle_price_id?: string
  llm_model?: string
  is_active: boolean
  sort_order?: number
}

/**
 * Editable fields when creating/updating a plan. Credits and the token cap
 * are auto-derived from `questions` — never sent by the frontend.
 */
export interface PlanInput {
  name: string
  price_usd: string
  questions: number
  max_documents: number
  max_total_mb: number
  is_active: boolean
  allow_api_sync?: boolean
  paddle_price_id?: string
}

export interface Subscription {
  id: UUID
  user?: UUID
  username?: string
  plan?: Plan | null
  plan_name?: string
  status?: string
  current_period_start?: ISODateString
  current_period_end?: ISODateString
  is_current?: boolean
  auto_renew?: boolean
}

export interface AssignSubscriptionRequest {
  user: UUID
  plan: UUID
  duration_days: number
  auto_renew: boolean
}

/** Admin credit top-up (POST /subscriptions/add-credits/). */
export interface AddCreditsRequest {
  user: UUID
  amount: number
}

/** Credit balance for the caller (chat costs credits per question). */
export interface CreditInfo {
  balance: number
  credits_per_question: number
  /** Admin/staff never spend credits — `questions_left` is null; show "unlimited". */
  exempt?: boolean
  questions_left: number | null
}

/** Live usage limits for the caller (GET /my-subscription/). */
export interface SubscriptionUsage {
  documents_used?: number
  documents_limit?: number
  storage_mb_used?: number
  storage_mb_limit?: number
  max_requests_per_min?: number
}

export interface MySubscription {
  subscription: {
    plan: Partial<Plan> & { name: string }
    status?: string
    current_period_start?: ISODateString
    current_period_end?: ISODateString
    is_current?: boolean
  } | null
  on_free_tier: boolean
  credits: CreditInfo
  usage: SubscriptionUsage
}

// --- Per-user feature control (§11) ----------------------------------------

/** Gated capabilities: api_sync, website_crawl, api_key, guided_tree, whatsapp, … */
export interface FeatureCatalogItem {
  key: string
  label: string
  description: string
}

/** Resolution: staff → always on; else admin override; else plan default. */
export interface ResolvedFeature {
  enabled: boolean
  source: 'staff' | 'override' | 'default'
  label: string
}

export interface MyFeatures {
  features: Record<string, ResolvedFeature>
}

/** Admin view: resolved features plus the raw overrides. */
export interface UserFeatures extends MyFeatures {
  overrides: Record<string, boolean>
}

/** true/false force a feature; null clears the override (inherit default). */
export type FeatureOverrides = Record<string, boolean | null>

// --- Guided question tree (§5c) --------------------------------------------

/** One tappable node: a question with an optional answer and child questions. */
export interface GuidedTreeNode {
  id: UUID
  title: string
  answer: string
  order: number
  language: string
  children: GuidedTreeNode[]
}

export interface GuidedTreeResponse {
  language: string
  canonical_language: string
  tree: GuidedTreeNode[]
}

export interface TreeLanguage {
  id: UUID
  code: string
  name: string
  is_active: boolean
  /** "account" = this tenant added it; "global" = an admin added it for every tenant. */
  scope?: 'account' | 'global'
  /** Progress: nodes translated into this language / nodes in the canonical tree. */
  translated_nodes?: number
  total_nodes?: number
  /** True while a background translation of this tenant's tree is running. */
  translating?: boolean
}

/** Writes always target the canonical language; mirrors follow async. */
export interface GuidedNodeInput {
  title: string
  answer?: string
  parent?: UUID | null
  order?: number
  is_active?: boolean
}

// --- Knowledge chunks (§4 "control the knowledge content") -----------------

/** One searchable piece of a document — what the bot actually retrieves from. */
export interface KnowledgeChunk {
  id: UUID
  document: UUID
  document_filename: string
  source_type: DocumentSourceType
  position: number
  content: string
  char_count: number
  source_id: string
  content_hash: string
  embedding_model: string
  is_embedded: boolean
  created_at: ISODateString
  updated_at: ISODateString
}

/** One row of GET /knowledge/sources/ — a source you can open as a page. */
export interface KnowledgeSource {
  id: UUID
  filename: string
  source_type: DocumentSourceType
  api_url: string
  is_active: boolean
  processing_status: ProcessingStatus
  section_count: number
  edited_count: number
  char_count: number
  created_at: ISODateString
  updated_at: ISODateString
}

/**
 * GET /knowledge/sources/ — the sources grouped by origin. All three keys are
 * always present, empty or not, so a tab per type never reads undefined.
 */
export interface KnowledgeSources {
  sources: Record<DocumentSourceType, KnowledgeSource[]>
  totals: Record<DocumentSourceType, { documents: number; sections: number; chars: number }>
}

/** One piece of a source, as GET /knowledge/sources/{id}/ returns it. */
export interface SourceSection {
  id: UUID
  position: number
  content: string
  /** How many opening characters merely repeat the previous section. */
  lead: number
  char_count: number
  source_id: string
  edited_at: ISODateString | null
  was_edited: boolean
  manually_added: boolean
}

/**
 * GET/PUT /knowledge/sources/{id}/ — one source as a page. `content` is the
 * whole text with the chunker's repeats already removed; `sections` is only for
 * an audit view that edits a single piece via /knowledge/{id}/.
 */
export interface SourcePage {
  document: {
    id: UUID
    filename: string
    source_type: DocumentSourceType
    api_url: string
    is_active: boolean
    processing_status: ProcessingStatus
    created_at: ISODateString
    updated_at: ISODateString
  }
  content: string
  char_count: number
  section_count: number
  edited_count: number
  sections: SourceSection[]
}

/** One document inside GET /knowledge/full/ — its full joined text. */
export interface FullKnowledgeDocument {
  id: UUID
  filename: string
  source_type: DocumentSourceType
  chunk_count: number
  char_count: number
  content: string
}

/** The tenant's entire knowledge base in one response. */
export interface FullKnowledge {
  document_count: number
  chunk_count: number
  char_count: number
  documents: FullKnowledgeDocument[]
}

/** Per-document outcome of PATCH /knowledge/full/. */
export type BulkKnowledgeStatus = 'updated' | 'not_found' | 'unavailable' | 'error'

export interface BulkKnowledgeResult {
  updated: number
  total: number
  results: Array<{ id: UUID; status: BulkKnowledgeStatus; chunk_count?: number }>
}

// --- Knowledge gaps (unanswered questions) ---------------------------------

export type UnansweredStatus = 'new' | 'reviewed' | 'answered' | 'dismissed'

export interface UnansweredQuestion {
  id: UUID
  question: string
  question_key: string
  language: string
  reason: string
  status: UnansweredStatus
  occurrences: number
  last_asked_at: ISODateString
  created_at: ISODateString
}

// --- WhatsApp ---------------------------------------------------------------

/** A linked WhatsApp Business number (admin-managed). */
export interface WhatsAppAccount {
  id: UUID
  tenant: UUID
  tenant_username?: string
  username?: string
  phone_number_id: string
  display_name: string
  is_active?: boolean
  created_at?: ISODateString
  updated_at?: ISODateString
}

export interface WhatsAppAccountInput {
  tenant: string
  phone_number_id: string
  display_name: string
  access_token?: string // write-only; falls back to env
}

export interface WhatsAppContact {
  id: UUID
  phone_number: string
  profile_name?: string
  language_preference?: string
  is_active?: boolean
  created_at?: ISODateString
  last_message_at?: ISODateString
}

export interface WhatsAppSession {
  id: UUID
  user?: UUID
  phone_number?: string
  profile_name?: string
  session_type?: string
  is_active?: boolean
  created_at?: ISODateString
  updated_at?: ISODateString
}

export interface WhatsAppMessage {
  id: UUID
  message_type?: string
  direction?: string // incoming | outgoing
  status?: string
  message_text?: string
  user?: UUID
  phone_number?: string
  profile_name?: string
  session?: UUID
  created_at?: ISODateString
  timestamp?: ISODateString
}

export interface WhatsAppSendRequest {
  to_number: string
  message: string
}

export interface WhatsAppSendResponse {
  message_id: string
  status: string
}

/** Daily aggregate row — exact metric fields vary, so kept loose. */
export interface WhatsAppAnalyticsRow {
  id?: UUID
  date: string
  [metric: string]: number | string | undefined
}

/** Standard DRF paginated list envelope. */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Common list query params accepted by DRF list endpoints. */
export interface ListParams {
  page?: number
  search?: string
  ordering?: string
  [key: string]: string | number | boolean | undefined
}

/** Shape of a DRF error body: per-field map or { detail }. */
export interface ApiErrorBody {
  detail?: string
  [field: string]: string | string[] | undefined
}
