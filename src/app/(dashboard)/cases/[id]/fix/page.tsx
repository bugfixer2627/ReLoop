import { notFound } from "next/navigation";
import { FoundationNotice } from "@/components/foundation-notice";
import { demoBundle } from "@/lib/fixtures/demo";
import { platformDefinitions } from "@/lib/config/platforms";

export default async function FixAndApprove({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== demoBundle.case.id) notFound();
  return (
    <>
      <div className="page-heading"><p className="eyebrow">03 / FIX & APPROVE</p><h1>协同修订，人工审核。</h1><p>客服回复与商品纠错共享同一个案例。<br /><span>Review support and listing corrections in one workspace.</span></p></div>
      <FoundationNotice />
      <section className="panel"><div className="section-heading"><h2>客服回复 <small>Customer Support</small></h2><span className="badge">English</span></div><div className="empty-state">尚未生成回复草稿。<small>No support draft has been generated.</small></div><button disabled className="primary" type="button">生成回复 / Generate reply · 待接入</button></section>
      <section className="panel"><h2>商品纠错 <small>Marketing & Marketplace Operations</small></h2><div className="platform-chips">{Object.values(platformDefinitions).map((platform) => <span className="chip" key={platform.label}>{platform.label} · {platform.segment.toUpperCase()}</span>)}</div><div className="empty-state">尚未生成平台纠错草稿。<small>No listing corrections have been generated. Amazon DE may use an English internal brief.</small></div></section>
      <section className="panel"><h2>对话修订 <small>Conversational revision</small></h2><p className="muted">客服回复和商品纠错均支持独立版本历史。Support and listing artifacts each retain their own versions.</p><label>后续指令 / Follow-up instruction<textarea disabled rows={2} placeholder="请缩短回复，并说明需要确认测试条件。" /></label><div className="actions"><button disabled type="button">语音输入 / Voice input · 待接入</button><button disabled className="primary" type="button">保存新版本 / Revise · 待接入</button></div></section>
      <div className="two-column"><section className="panel"><h2>质量跟进 <small>Quality Assurance</small></h2><p className="muted">尚未创建任务。No investigation task has been created.</p></section><section className="panel"><h2>审核记录 <small>Compliance & Review</small></h2><p className="muted">尚无审核记录。No draft has been approved.</p><button disabled type="button">审核草稿 / Review · 待接入</button></section></div>
    </>
  );
}
