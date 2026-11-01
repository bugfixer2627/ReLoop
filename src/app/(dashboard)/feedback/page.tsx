'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/reloop-ui/icons';
import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { rememberCase } from '@/components/reloop-ui/useSelectedCase';
import { VoiceInput } from '@/components/reloop-ui/VoiceInput';
import { InboxContext } from '@/components/reloop-ui/InboxContext';
import { ApiRequestError, analyzeCase, createCase } from '@/lib/frontend/api-client';
import { requestMessage } from '@/lib/frontend/request-message';
import { caseFieldIsInvalid, updateInvalidFields, type CaseInput, type CaseInputField } from '@/lib/frontend/case-validation';
import { demoBundle } from '@/lib/fixtures/demo';
import { platformLabel } from '@/lib/config/platforms';
import { createCaseRequestSchema, inputLocaleSchema, platformSchema, type InputLocale, type Platform } from '@/lib/contracts';

const fieldIds: Record<string, string> = { sku: 'sku', channel: 'channel', feedbackText: 'customer-feedback', merchantInstruction: 'merchant-instruction', feedbackLocale: 'feedback-locale', merchantLocale: 'merchant-locale' };

export default function FeedbackPage() {
  const router = useRouter();
  const { accessToken, locale } = useWorkspace();
  const [merchantInstruction, setMerchantInstruction] = useState('');
  const [merchantLocale, setMerchantLocale] = useState<InputLocale>('en-US');
  const [sku, setSku] = useState('');
  const [platform, setPlatform] = useState<Platform>('shopify_us');
  const [feedbackLocale, setFeedbackLocale] = useState<InputLocale>('en-US');
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ reason: unknown; stage: 'save' | 'analysis' } | null>(null);
  const [validatedFields, setInvalidFields] = useState<CaseInputField[]>([]);
  const [saved, setSaved] = useState<{ id: string; input: CaseInput } | null>(null);
  const [analysisUnavailable, setAnalysisUnavailable] = useState(false);
  const text = locale === 'zh-CN' ? {
    title: '反馈收件箱', description: '将客户反馈与商家指令保存为可追溯的案例。',
    product: '商品与平台', sku: '商品 SKU', platform: '反馈来源平台', skuHint: '输入已登记的演示商品 SKU，与案例 ID 不同。',
    skuPlaceholder: '例如 RL-LAMP-01…', platformHint: '固定支持的平台范围，不代表已连接卖家账户。',
    outputHint: '目标输出语言由平台工作流决定，与原始反馈及指令语言分别处理。',
    complaint: '客户反馈原文', feedbackLanguage: '客户反馈语言', complaintHint: '保留客户原话；切换界面语言不会翻译或替换输入。', complaintPlaceholder: '粘贴合成客户反馈原文…',
    instruction: '商家指令', merchantLanguage: '指令与语音语言', instructionHint: '说明希望核对的内容；指令语言与界面语言分别设置。', instructionPlaceholder: '输入核对要求或确认语音转写…',
    english: '英语', chinese: '简体中文', voice: '语音输入（可选）',
    useExample: '载入合成示例', submit: '保存并分析', saving: '正在保存…', saved: '案例已保存',
    retry: '重试证据核对', retrying: '正在核对…', openCase: '打开原始案例', savedSku: '已保存 SKU',
    retained: '输入未变时只重试核对，继续使用同一案例。', changed: '当前表单已更改。再次保存会新建案例，不会修改原始反馈或商品关联。',
    unavailable: '案例已保存。分析服务当前不可用，未生成分析结果。',
    synthetic: '仅输入合成演示数据，请勿填写真实客户个人信息。',
    actionHint: '先保存原始反馈，再核对已保存的商品快照与规格。当前核对不代表完整 AI 分析。',
    skuError: '请填写有效 SKU（1–100 字符）。', complaintError: '请填写客户反馈（1–10,000 字符）。', instructionError: '请填写商家指令（1–4,000 字符）。', languageError: '请选择有效语言或平台。',
  } : {
    title: 'Feedback inbox', description: 'Save the customer message and merchant instruction as a traceable case.',
    product: 'Product & marketplace', sku: 'Product SKU', platform: 'Feedback marketplace', skuHint: 'Use a registered demo product SKU. It is different from the case ID.',
    skuPlaceholder: 'For example, RL-LAMP-01…', platformHint: 'Fixed supported platforms; these are not connected seller accounts.',
    outputHint: 'Target output language follows the marketplace workflow, separately from source feedback and instruction languages.',
    complaint: 'Customer complaint', feedbackLanguage: 'Customer feedback language', complaintHint: 'Keep the original message. Switching interface language never translates or replaces it.', complaintPlaceholder: 'Paste the synthetic customer message…',
    instruction: 'Merchant instruction', merchantLanguage: 'Instruction & voice language', instructionHint: 'Describe what to check. Instruction language is independent of interface language.', instructionPlaceholder: 'Enter the evidence check request or confirm a voice transcript…',
    english: 'English', chinese: 'Simplified Chinese', voice: 'Voice input (optional)',
    useExample: 'Load synthetic example', submit: 'Save and analyze', saving: 'Saving…', saved: 'Case saved',
    retry: 'Retry evidence check', retrying: 'Checking evidence…', openCase: 'Open original case', savedSku: 'Saved SKU',
    retained: 'Unchanged input retries the evidence check using the same case.', changed: 'This form has changed. Saving again creates a new case; the original feedback and product association stay unchanged.',
    unavailable: 'The case was saved. Analysis is currently unavailable; no result was generated.',
    synthetic: 'Synthetic demo data only. Do not enter real customer personal information.',
    actionHint: 'Save the original feedback, then check saved listing snapshots against specifications. This check is not a complete AI analysis.',
    skuError: 'Enter a valid SKU (1–100 characters).', complaintError: 'Enter the customer message (1–10,000 characters).', instructionError: 'Enter a merchant instruction (1–4,000 characters).', languageError: 'Choose a valid language or marketplace.',
  };
  const currentInput = createCaseRequestSchema.safeParse({
    sku, channel: platform, feedbackText: customerFeedback, feedbackLocale,
    merchantInstruction, merchantLocale, synthetic: true,
  });
  const canRetrySavedCase = !!saved && currentInput.success && JSON.stringify(saved.input) === JSON.stringify(currentInput.data);
  const invalidFields = currentInput.success ? [] : validatedFields.filter((field) => currentInput.error.issues.some((issue) => issue.path[0] === field));

  function updateField(field: CaseInputField, value: string, update: (value: string) => void) {
    update(value);
    if (!validatedFields.includes(field)) return;

    const input: CaseInput = {
      sku, channel: platform, feedbackText: customerFeedback, feedbackLocale,
      merchantInstruction, merchantLocale, synthetic: true, [field]: value,
    };
    const remainsInvalid = caseFieldIsInvalid(input, field, value);
    setInvalidFields((fields) => updateInvalidFields(fields, field, remainsInvalid));
  }

  function fieldError(field: CaseInputField) {
    if (!invalidFields.includes(field)) return null;
    const message = field === 'sku' ? text.skuError : field === 'feedbackText' ? text.complaintError : field === 'merchantInstruction' ? text.instructionError : text.languageError;
    return <p id={`${fieldIds[field]}-error`} className="field-error">{message}</p>;
  }

  function loadExample() {
    setSku(demoBundle.case.sku);
    setPlatform(demoBundle.case.channel);
    setFeedbackLocale(inputLocaleSchema.parse(demoBundle.case.feedbackLocale));
    setMerchantLocale(demoBundle.case.merchantLocale);
    setCustomerFeedback(demoBundle.case.feedbackText);
    setMerchantInstruction(demoBundle.case.merchantInstruction);
    setSaved(null);
    setAnalysisUnavailable(false);
    setError(null);
    setInvalidFields([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || saving) return;
    setError(null);
    if (!currentInput.success) {
      const fields = currentInput.error.issues.map((issue) => issue.path[0]).filter((field): field is CaseInputField => field === 'sku' || field === 'feedbackText' || field === 'merchantInstruction');
      setInvalidFields(fields);
      if (fields[0]) document.getElementById(fieldIds[fields[0]])?.focus();
      return;
    }
    setInvalidFields([]);
    setSaving(true);
    setAnalysisUnavailable(false);
    const input = currentInput.data;
    try {
      const caseId = saved && canRetrySavedCase ? saved.id : (await createCase(accessToken, input)).caseId;
      setSaved({ id: caseId, input });
      rememberCase(caseId);
      try {
        await analyzeCase(accessToken, caseId);
        router.push(`/cases/${caseId}`);
      } catch (reason) {
        if (reason instanceof ApiRequestError && reason.code === 'NOT_IMPLEMENTED') setAnalysisUnavailable(true);
        else setError({ reason, stage: 'analysis' });
      }
    } catch (reason) {
      setError({ reason, stage: 'save' });
    } finally { setSaving(false); }
  }

  const languageOptions = <><option value="en-US">{text.english}</option><option value="zh-CN">{text.chinese}</option></>;
  return (
    <WorkspaceShell title={text.title}>
      <div className="page feedback-page">
        <PageHeading title={text.title} description={text.description} actions={<button className="btn btn-soft btn-sm" type="button" disabled={saving} onClick={loadExample}><Icon name="file" size={14}/>{text.useExample}</button>}/>
        <p className="api-notice synthetic-only" role="note">{text.synthetic}</p>
        <div className="inbox-layout"><form className="card card-pad feedback-form" noValidate onSubmit={submit}>
          <fieldset className="feedback-section feedback-product" disabled={saving}>
            <legend>{text.product}</legend>
            <div className="feedback-context-grid">
              <div className="field"><label htmlFor="sku">{text.sku}</label><input id="sku" name="sku" className="input" autoComplete="off" spellCheck={false} required maxLength={100} value={sku} placeholder={text.skuPlaceholder} aria-invalid={invalidFields.includes('sku')} aria-describedby={`sku-hint${invalidFields.includes('sku') ? ' sku-error' : ''}`} onChange={(event) => updateField('sku', event.target.value, setSku)}/><p id="sku-hint" className="feedback-helper">{text.skuHint}</p>{fieldError('sku')}</div>
              <div className="field"><label htmlFor="channel">{text.platform}</label><select id="channel" name="channel" className="select" value={platform} onChange={(event) => setPlatform(platformSchema.parse(event.target.value))}>{platformSchema.options.map((id) => <option key={id} value={id}>{platformLabel(id, locale)}</option>)}</select><p className="feedback-helper">{text.platformHint}</p></div>
            </div>
            <p className="feedback-helper feedback-output-note">{text.outputHint}</p>
          </fieldset>
          <div className="feedback-writing-grid">
            <fieldset className="feedback-section" disabled={saving}>
              <legend>{text.complaint}</legend>
              <div className="field"><label htmlFor="feedback-locale">{text.feedbackLanguage}</label><select id="feedback-locale" name="feedbackLocale" className="select" value={feedbackLocale} onChange={(event) => setFeedbackLocale(inputLocaleSchema.parse(event.target.value))}>{languageOptions}</select></div>
              <div className="field"><label htmlFor="customer-feedback">{text.complaint}</label><textarea id="customer-feedback" name="feedbackText" className="textarea" rows={7} required maxLength={10000} value={customerFeedback} placeholder={text.complaintPlaceholder} aria-invalid={invalidFields.includes('feedbackText')} aria-describedby={`feedback-hint${invalidFields.includes('feedbackText') ? ' customer-feedback-error' : ''}`} onChange={(event) => updateField('feedbackText', event.target.value, setCustomerFeedback)}/>{fieldError('feedbackText')}<p id="feedback-hint" className="feedback-helper">{text.complaintHint}</p></div>
            </fieldset>
            <fieldset className="feedback-section" disabled={saving}>
              <legend>{text.instruction}</legend>
              <div className="field"><label htmlFor="merchant-locale">{text.merchantLanguage}</label><select id="merchant-locale" name="merchantLocale" className="select" value={merchantLocale} onChange={(event) => setMerchantLocale(inputLocaleSchema.parse(event.target.value))}>{languageOptions}</select></div>
              <div className="field"><label htmlFor="merchant-instruction">{text.instruction}</label><textarea id="merchant-instruction" name="merchantInstruction" className="textarea" rows={4} required maxLength={4000} value={merchantInstruction} placeholder={text.instructionPlaceholder} aria-invalid={invalidFields.includes('merchantInstruction')} aria-describedby={`instruction-hint${invalidFields.includes('merchantInstruction') ? ' merchant-instruction-error' : ''}`} onChange={(event) => updateField('merchantInstruction', event.target.value, setMerchantInstruction)}/>{fieldError('merchantInstruction')}<p id="instruction-hint" className="feedback-helper">{text.instructionHint}</p></div>
              <div className="feedback-voice"><h3>{text.voice}</h3><VoiceInput disabled={saving} inputLocale={merchantLocale} onConfirmed={(value) => setMerchantInstruction((current) => current ? `${current}\n${value}` : value)}/></div>
            </fieldset>
          </div>
          <div className="feedback-actions">
            {error && <div className="api-error" role="alert">{requestMessage(error.reason, locale, error.stage)}</div>}
            {saved && <div className="api-notice saved-submission" role="status"><strong>{text.saved}</strong><p>{text.savedSku}: <span translate="no">{saved.input.sku}</span></p>{analysisUnavailable && <p>{text.unavailable}</p>}<p>{canRetrySavedCase ? text.retained : text.changed}</p><Link href={`/cases/${saved.id}`} className="card-link case-back-link">{text.openCase}<Icon name="arrow" size={13}/></Link></div>}
            <div className="feedback-submit-row"><p className="feedback-helper">{text.actionHint}</p><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? (canRetrySavedCase ? text.retrying : text.saving) : canRetrySavedCase ? text.retry : text.submit}<Icon name="arrow" size={14}/></button></div>
          </div>
        </form><InboxContext hasSku={!!sku.trim()} hasFeedback={!!customerFeedback.trim()} hasInstruction={!!merchantInstruction.trim()}/></div>
      </div>
    </WorkspaceShell>
  );
}
