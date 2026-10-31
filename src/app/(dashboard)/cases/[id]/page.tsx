import Link from "next/link";
import { notFound } from "next/navigation";
import { FoundationNotice } from "@/components/foundation-notice";
import { demoBundle } from "@/lib/fixtures/demo";
import { platformDefinitions } from "@/lib/config/platforms";

export default async function Investigation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== demoBundle.case.id) notFound();
  return (
    <>
      <div className="page-heading"><p className="eyebrow">02 / CLAIM INVESTIGATION</p><h1>先核对证据，再作判断。</h1><p>原始反馈、产品记录和平台快照。<br /><span>Original inputs and evidence. No generated findings yet.</span></p></div>
      <FoundationNotice />
      <div className="stat-grid">
        <section className="panel stat"><small>客户陈述 / Customer report</small><strong>2 h</strong><span>未经核实 / Unverified</span></section>
        <section className="panel stat"><small>合成规格 / Fictional specification</small><strong>4 h</strong><span>SPEC-001 · 条件限定 / Conditional</span></section>
        <section className="panel stat"><small>三个快照 / Three snapshots</small><strong>12 h</strong><span>原始承诺 / Original claim</span></section>
      </div>
      <section className="panel"><h2>测试条件 <small>Fictional test conditions</small></h2><p>{demoBundle.evidence[0].content}</p><p className="muted">客户实际使用条件未知；不能据此认定产品存在缺陷。Customer operating conditions remain unknown.</p></section>
      <div className="listing-grid">{demoBundle.listings.map((listing) => (
        <section className="panel" key={listing.id}><span className="badge">{listing.segment.toUpperCase()}</span><h2>{platformDefinitions[listing.platform].label}</h2><p>{String(listing.fields.title)}</p><p className="claim">{listing.numericClaim?.value} h</p><small>{listing.id} · {listing.snapshotVersion}</small></section>
      ))}</div>
      <section className="panel"><h2>规则来源清单 <small>Candidate references</small></h2><p className="muted">所有规则均待核验。当前没有法律或平台规则判定。</p><ul className="source-list">{demoBundle.rules.map((rule) => <li key={rule.id}><a href={rule.sourceUrl} target="_blank" rel="noreferrer">{rule.id} ↗</a><span>待核验 / Needs verification</span></li>)}</ul></section>
      <Link className="text-link" href={`/cases/${id}/fix`}>查看修订工作区 / Continue to workspace →</Link>
    </>
  );
}
