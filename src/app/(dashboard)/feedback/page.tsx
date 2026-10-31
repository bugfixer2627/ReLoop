'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/reloop-ui/icons';
import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { VoiceInput } from '@/components/reloop-ui/VoiceInput';
import { ApiRequestError, analyzeCase, createCase } from '@/lib/frontend/api-client';
import { demoBundle } from '@/lib/fixtures/demo';
import { createCaseRequestSchema, platformSchema } from '@/lib/contracts';

export default function FeedbackPage() {
  const router = useRouter();
  const { accessToken, locale } = useWorkspace();
  const [merchantInstruction, setMerchantInstruction] = useState('');
  const [sku, setSku] = useState('');
  const [platform, setPlatform] = useState<'shopify_us' | 'amazon_de' | 'alibaba_intl'>('shopify_us');
  const [feedbackLocale, setFeedbackLocale] = useState<'en-US' | 'zh-CN'>('en-US');
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [savedInput, setSavedInput] = useState<string | null>(null);
  const [analysisUnavailable, setAnalysisUnavailable] = useState(false);
  const text = locale === 'zh-CN' ? {
    eyebrow: 'CAPTURE & CLARIFY', title: '反馈收件箱', description: '把客户反馈保存为可追溯的案例。',
    instruction: '商家指令', sku: 'SKU', platform: '平台', complaint: '客户反馈原文',
    useExample: '载入合成示例', submit: '保存并分析', saving: '正在保存…', saved: '案例已保存',
    analysisUnavailable: '案例已保存。分析服务当前不可用，未生成分析结果。', retry: '重试核对', retrying: '正在核对…', retained: '原始反馈已保存，可打开案例；输入未变时重试不会新建案例。', openCase: '打开已保存案例', source: '来源状态',
  } : {
    eyebrow: 'CAPTURE & CLARIFY', title: 'Feedback inbox', description: 'Save the customer message as a traceable case.',
    instruction: 'Merchant instruction', sku: 'SKU', platform: 'Platform', complaint: 'Customer complaint',
    useExample: 'Load synthetic example', submit: 'Save and analyze', saving: 'Saving…', saved: 'Case saved',
    analysisUnavailable: 'The case was saved. Analysis is currently unavailable; no result was generated.', retry: 'Retry evidence check', retrying: 'Checking evidence…', retained: 'The original feedback is saved. Open the case, or retry with unchanged input to reuse it.', openCase: 'Open saved case', source: 'Input state',
  };
  const currentInput = createCaseRequestSchema.safeParse({
    sku, channel: platform, feedbackText: customerFeedback, feedbackLocale,
    merchantInstruction, merchantLocale: locale, synthetic: true,
  });
  const canRetrySavedCase = savedCaseId !== null && currentInput.success && savedInput === JSON.stringify(currentInput.data);

  function loadExample() {
    setSku(demoBundle.case.sku);
    setPlatform(demoBundle.case.channel);
    setFeedbackLocale(demoBundle.case.feedbackLocale as 'en-US' | 'zh-CN');
    setCustomerFeedback(demoBundle.case.feedbackText);
    setMerchantInstruction(demoBundle.case.merchantInstruction);
    setSavedCaseId(null);
    setSavedInput(null);
    setAnalysisUnavailable(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || saving) return;
    setSaving(true);
    setError(null);
    setAnalysisUnavailable(false);
    try {
      const input = createCaseRequestSchema.parse({
        sku, channel: platform, feedbackText: customerFeedback, feedbackLocale,
        merchantInstruction, merchantLocale: locale, synthetic: true,
      });
      const fingerprint = JSON.stringify(input);
      const caseId = savedCaseId && fingerprint === savedInput
        ? savedCaseId
        : (await createCase(accessToken, input)).caseId;
      setSavedCaseId(caseId);
      setSavedInput(fingerprint);
      try {
        await analyzeCase(accessToken, caseId);
        router.push(`/cases/${caseId}`);
      } catch (reason) {
        if (reason instanceof ApiRequestError && reason.code === 'NOT_IMPLEMENTED') setAnalysisUnavailable(true);
        else setError(reason instanceof ApiRequestError ? reason.message : (locale === 'zh-CN' ? '证据核对失败，请重试或打开已保存案例。' : 'Evidence checking failed. Retry or open the saved case.'));
      }
    } catch (reason) {
      setError(reason instanceof ApiRequestError ? reason.message : 'Please check the required fields and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell title={text.title}>
      <div className="page">
        <PageHeading eyebrow={text.eyebrow} title={text.title} description={text.description} actions={<button className="btn btn-soft btn-sm" type="button" onClick={loadExample}><Icon name="file" size={14}/>{text.useExample}</button>}/>
        <div className="api-notice synthetic-only" role="note">{locale === 'zh-CN' ? '仅输入合成演示数据。请勿填写真实客户个人信息。' : 'Synthetic demo data only. Do not enter real customer personal information.'}</div>
        <div className="split">
          <form className="card card-pad" onSubmit={submit}>
            <div className="card-title-row"><span className="card-title">{text.instruction} · 中文 / English</span><span className="badge badge-neutral">{text.source} · Synthetic only</span></div>
            <div className="field"><label htmlFor="merchant-instruction">{text.instruction}</label><textarea id="merchant-instruction" className="textarea" rows={3} required maxLength={4000} value={merchantInstruction} onChange={(event) => setMerchantInstruction(event.target.value)} /></div>
            <div className="field voice-field"><label>{locale === 'zh-CN' ? '语音指令' : 'Voice instruction'}</label><VoiceInput onConfirmed={(value) => setMerchantInstruction((current) => current ? `${current}\n${value}` : value)}/></div>
            <div className="split input-row">
              <div className="field"><label htmlFor="sku">{text.sku}</label><input id="sku" className="input" required maxLength={100} value={sku} onChange={(event) => setSku(event.target.value)}/></div>
              <div className="field"><label htmlFor="channel">{text.platform}</label><select id="channel" className="select" value={platform} onChange={(event) => setPlatform(platformSchema.parse(event.target.value))}><option value="shopify_us">Shopify US</option><option value="amazon_de">Amazon Germany</option><option value="alibaba_intl">Alibaba International</option></select></div>
            </div>
            <div className="field input-row"><label htmlFor="feedback-locale">{locale === 'zh-CN' ? '客户反馈语言' : 'Customer language'}</label><select id="feedback-locale" className="select" value={feedbackLocale} onChange={(event) => setFeedbackLocale(event.target.value as typeof feedbackLocale)}><option value="en-US">English</option><option value="zh-CN">中文 / Simplified Chinese</option></select></div>
            <div className="field"><label htmlFor="customer-feedback">{text.complaint} · {feedbackLocale === 'zh-CN' ? '中文' : 'English'}</label><textarea id="customer-feedback" className="textarea" required maxLength={10000} value={customerFeedback} onChange={(event) => setCustomerFeedback(event.target.value)}/></div>
            {error && <div className="api-error" role="alert">{error}</div>}
            {savedCaseId && <div className="api-notice" role="status"><strong>{text.saved}</strong><p>{analysisUnavailable ? text.analysisUnavailable : text.retained}</p><Link href={`/cases/${savedCaseId}`} className="card-link">{text.openCase} <Icon name="arrow" size={13}/></Link></div>}
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? (canRetrySavedCase ? text.retrying : text.saving) : canRetrySavedCase ? text.retry : text.submit}<Icon name="arrow" size={14}/></button>
          </form>
          <section className="card card-pad">
            <div className="card-title-row"><span className="card-title">{locale === 'zh-CN' ? '工作流状态' : 'Workflow status'}</span><span className="badge badge-neutral">Case API</span></div>
            <div className="activity-list">
              <div className="activity-item"><span className="activity-dot"/><p><b>{locale === 'zh-CN' ? '案例保存' : 'Case persistence'}</b><br/><small>POST /api/cases</small></p></div>
              <div className="activity-item"><span className="activity-dot"/><p><b>{locale === 'zh-CN' ? '证据核对' : 'Evidence check'}</b><br/><small>{locale === 'zh-CN' ? '核对商品快照与规格；不代表已完成 AI 分析。' : 'Compares saved listings and specifications; AI analysis is not yet available.'}</small></p></div>
              <div className="activity-item"><span className="activity-dot"/><p><b>{locale === 'zh-CN' ? '语音转写' : 'Voice transcription'}</b><br/><small>POST /api/transcribe · 501</small></p></div>
            </div>
            <div className="api-notice"><p>{locale === 'zh-CN' ? '只会显示数据库中保存的数据。没有分析结果时不会展示模拟发现。' : 'Only persisted case data is shown. No simulated findings are shown when analysis is unavailable.'}</p></div>
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
