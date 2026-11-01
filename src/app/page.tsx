import Image from 'next/image';
import Link from 'next/link';
import { Brand } from '@/components/reloop-ui/Brand';
import { Icon } from '@/components/reloop-ui/icons';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="reloop-ui landing-v2">
      <a className="landing-skip" href="#landing-content">Skip to content</a>
      <main className="landing-main">
      <div className="landing-hero-surface">
        <header className="marketing-nav">
          <Brand dark/>
          <nav className="marketing-links" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#workflow">Workflow</a>
            <a href="#resources">Workspace</a>
          </nav>
          <div className="nav-actions">
            <Link className="ghost-link" href="/login">Workspace access</Link>
            <Link className="btn btn-primary btn-sm" href="/login">Enter ReLoop <Icon name="arrow" size={14}/></Link>
          </div>
        </header>

        <section className="hero brand-hero" id="landing-content" tabIndex={-1} aria-labelledby="landing-title">
          <div className="brand-hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot"/>Cross-border product clarity</div>
            <h1 className="display" id="landing-title">Turn Customer Feedback Into <span>Clearer Product Claims</span></h1>
            <p className="hero-copy">Keep customer feedback, product evidence, and marketplace listing snapshots together as your team reviews product claims and prepares channel-specific corrections.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/login">Open workspace <Icon name="arrow" size={15}/></Link>
              <a className="btn btn-soft" href="#workflow">Explore the workflow</a>
            </div>
            <div className="hero-note"><span><b>01</b> Customer signal</span><span><b>02</b> Evidence review</span><span><b>03</b> Human decision</span></div>
          </div>
          <div className="landing-showcase">
          <div className="process-visual" role="group" aria-label="ReLoop review process: customer report, claim review, localized correction, and team approval">
            <Image className="process-art" src="/brand/reloop-process-loop.png" alt="" width={1448} height={1086} priority sizes="(max-width: 760px) 100vw, 52vw"/>
            <a className="process-node process-report" href="#workflow">Customer report</a>
            <a className="process-node process-review" href="#workflow">Claim review</a>
            <a className="process-node process-correction" href="#workflow">Localized correction</a>
            <a className="process-node process-approval" href="#workflow">Team approval</a>
          </div>
          <figure className="landing-preview" aria-labelledby="preview-caption">
            <figcaption id="preview-caption"><Icon name="grid" size={14}/><span>Interface preview</span><small>No live case data</small></figcaption>
            <div className="landing-preview-body">
              <div className="landing-preview-rail" aria-hidden="true"><Icon name="inbox" size={17}/><Icon name="search" size={17}/><Icon name="shield" size={17}/></div>
              <div className="landing-preview-content">
                <div className="landing-preview-heading"><strong>Claim investigation</strong><span>Awaiting a case</span></div>
                <div className="landing-preview-panels">
                  <div><Icon name="file" size={15}/><strong>Product evidence</strong><p>No case selected</p></div>
                  <div><Icon name="globe" size={15}/><strong>Listing snapshot</strong><p>No case selected</p></div>
                </div>
                <p className="landing-preview-note"><Icon name="shield" size={12}/>Drafts stay under human review.</p>
              </div>
            </div>
          </figure>
          </div>
        </section>
      </div>

      <div className="marketing-page landing-body">
        <section className="section brand-product-section" id="product">
          <div className="section-head">
            <div><div className="eyebrow"><span className="eyebrow-dot"/>A connected review loop</div><h2 className="display">Clear context at every step.</h2></div>
            <p className="section-intro">Bring the original customer message, product evidence, and destination listing into one reviewable case.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card"><div className="feature-icon"><Icon name="inbox" size={18}/></div><h3>Capture feedback</h3><p>Keep the complaint, language, SKU, and marketplace together as a saved case.</p></article>
            <article className="feature-card"><div className="feature-icon"><Icon name="search" size={18}/></div><h3>Review claim context</h3><p>Compare stored listing snapshots with the product evidence supplied for review.</p></article>
            <article className="feature-card"><div className="feature-icon"><Icon name="shield" size={18}/></div><h3>Keep a human in the loop</h3><p>Review each marketplace version before making a business decision.</p></article>
          </div>
        </section>

        <section className="section brand-workflow-section" id="workflow">
          <div className="workflow">
            <Image className="workflow-waveform" src="/brand/reloop-waveform.png" alt="" width={2172} height={724} sizes="610px"/>
            <div className="workflow-copy"><div className="eyebrow"><span className="eyebrow-dot"/>Review, revise, approve</div><h2 className="display">From customer report to a clearer listing.</h2><p>Both workflows share one saved case. Generation, speech, revisions and approval depend on the production services available to your workspace.</p><Link className="btn btn-lime" href="/dashboard" style={{ marginTop: 12 }}>Open case workspace <Icon name="arrow" size={15}/></Link></div>
            <div className="workflow-steps">
              <Link href="/feedback" className="workflow-step active"><span className="step-num">01</span><div><strong>Capture feedback</strong><small>Complaint, product, channel, language</small></div><Icon name="arrow" size={16}/></Link>
              <Link href="/dashboard" className="workflow-step"><span className="step-num">02</span><div><strong>Review the claim</strong><small>Compare saved copy and supporting records</small></div><Icon name="arrow" size={16}/></Link>
              <Link href="/dashboard" className="workflow-step"><span className="step-num">03</span><div><strong>Prepare a revision</strong><small>Keep localized drafts under human review</small></div><Icon name="arrow" size={16}/></Link>
            </div>
          </div>
        </section>

        <footer className="marketing-footer" id="resources"><span translate="no">ReLoop AI · Claim to Action</span><Link href="/login">Demo workspace · Synthetic records are labeled <Icon name="arrow" size={13}/></Link></footer>
      </div>
      </main>
    </div>
  );
}
