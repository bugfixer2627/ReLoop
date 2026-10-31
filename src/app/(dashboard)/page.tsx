import Link from "next/link";
import { FoundationNotice } from "@/components/foundation-notice";
import { demoBundle } from "@/lib/fixtures/demo";
import { platformDefinitions } from "@/lib/config/platforms";

export default function FeedbackInbox() {
  return (
    <>
      <div className="page-heading"><p className="eyebrow">01 / FEEDBACK INBOX</p><h1>从一条反馈开始。</h1><p>核对商品承诺，连接客服、运营与质量跟进。<br /><span>Investigate a complaint and coordinate the next action.</span></p></div>
      <FoundationNotice />
      <section className="panel" aria-labelledby="input-heading">
        <div className="section-heading"><h2 id="input-heading">客户反馈 <small>Customer feedback</small></h2><span className="badge">RL-LAMP-01</span></div>
        <div className="form-grid">
          <label>反馈来源 / Source<select disabled defaultValue="shopify_us"><option value="shopify_us">Shopify US · Support ticket</option></select></label>
          <label>输入语言 / Instruction language<select disabled defaultValue="zh-CN"><option value="zh-CN">中文 / Chinese</option><option value="en-US">English</option></select></label>
        </div>
        <label>客户原话 / Customer statement<textarea readOnly rows={2} value={demoBundle.case.feedbackText} /></label>
        <label>商家指令 / Merchant instruction<textarea readOnly rows={3} value={demoBundle.case.merchantInstruction} /></label>
        <div className="actions"><button disabled type="button">语音输入 / Voice input · 待接入</button><button disabled className="primary" type="button">开始分析 / Analyze · 待接入</button></div>
      </section>
      <section className="panel" aria-labelledby="sample-heading">
        <div className="section-heading"><h2 id="sample-heading">示例案例 <small>Fixture preview</small></h2><span className="badge">合成 / Synthetic</span></div>
        <p><strong>{demoBundle.product.name}</strong></p><p className="muted">客户报告约 2 小时续航。三个商品快照均包含 12 小时承诺。尚未执行分析。</p>
        <div className="platform-chips">{Object.values(platformDefinitions).map((platform) => <span className="chip" key={platform.label}>{platform.label} · {platform.segment.toUpperCase()}</span>)}</div>
        <Link className="text-link" href={`/cases/${demoBundle.case.id}`}>查看输入与证据样本 / View fixture →</Link>
      </section>
    </>
  );
}
