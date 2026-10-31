/** Integration documentation only. Not imported by the preserved pages.
 * Map these UI needs to the destination application's existing domain models.
 * No endpoint, transport, persistence or backend behavior is prescribed.
 */
export type DisplayStatus = 'risk' | 'review' | 'safe' | 'neutral';
export interface MerchantContext { displayName: string; email: string; avatarUrl?: string; locale: string; direction: 'ltr' | 'rtl'; }
export interface SourceReference { id: string; title: string; type: 'document' | 'image' | 'url'; href?: string; reviewedAt?: string; }
export interface CaseSummary { id: string; subject: string; sku: string; platformId: string; platformLabel: string; status: DisplayStatus; updatedAt: string; }
export interface Metric { id: string; label: string; displayValue: string; trendLabel?: string; }
export interface DashboardData { metrics: Metric[]; cases: CaseSummary[]; activities: {id: string; text: string; occurredAt: string}[]; series: {timestamp: string; value: number}[]; }
export interface SelectOption { id: string; label: string; }
export interface FeedbackInput { merchantInstruction: string; complaint: string; sku: string; platformId: string; transcript: string; evidenceIds: string[]; }
export interface FeedbackData { skuOptions: SelectOption[]; platformOptions: SelectOption[]; recentCases: CaseSummary[]; }
export type VoiceStatus = 'idle' | 'requesting-permission' | 'recording' | 'stopped' | 'transcribing' | 'ready' | 'error';
export interface VoiceViewState { status: VoiceStatus; transcript: string; elapsedSeconds?: number; errorMessage?: string; }
export interface ClaimFinding { id: string; title: string; description: string; status: DisplayStatus; sourceIds: string[]; jurisdiction?: string; platformId?: string; }
export interface InvestigationData { caseId: string; complaint: string; sku: string; platformId: string; originalClaim: string; productSpecification: string; findings: ClaimFinding[]; references: SourceReference[]; reviewedAt?: string; }
export interface DiffSegment { text: string; kind: 'unchanged' | 'removed' | 'added'; }
export interface PlatformDraft { caseId: string; platformId: string; locale: string; original: string; corrected: string; originalSegments: DiffSegment[]; correctedSegments: DiffSegment[]; versionId: string; }
export interface RevisionMessage { id: string; role: 'merchant' | 'assistant' | 'reviewer'; text: string; createdAt: string; }
export interface RevisionVersion { id: string; label: string; text: string; platformId: string; locale: string; authorName: string; createdAt: string; }
export interface QaTask { id: string; label: string; status: 'pending' | 'in-progress' | 'complete' | 'failed'; updatedAt?: string; }
export interface ApprovalViewState { status: 'pending' | 'submitting' | 'approved' | 'rejected' | 'error'; canApprove: boolean; approvedBy?: string; approvedAt?: string; errorMessage?: string; }
export interface RevisionData { drafts: PlatformDraft[]; messages: RevisionMessage[]; versions: RevisionVersion[]; tasks: QaTask[]; approval: ApprovalViewState; }
