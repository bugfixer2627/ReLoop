import Link from 'next/link';
import { Icon } from '@/components/icons';
import { Brand } from '@/components/Brand';

export default function LandingPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <Brand />
        <nav className="marketing-links" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#resources">Resources</a>
          <Link href="/design-lab">Design lab</Link>
        </nav>
        <div className="nav-actions">
          <Link className="ghost-link" href="/login">Log in</Link>
          <Link className="btn btn-primary btn-sm" href="/login">Book a demo <Icon name="arrow" size={14}/></Link>
        </div>
      </header>

      <section className="hero brand-hero">
        <div className="brand-hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/>Cross-border product clarity</div>
          <h1 className="display">Turn Customer Feedback Into <span>Better Global Products</span></h1>
          <p className="hero-copy">ReLoop AI helps cross-border merchants flag potential product-claim gaps, review supporting evidence, and prepare localized listing corrections across international marketplaces.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/login">Launch ReLoop <Icon name="arrow" size={15}/></Link>
            <a className="btn btn-soft" href="#workflow">Explore demo</a>
          </div>
        </div>
        <div className="process-visual" aria-label="ReLoop review process: customer report, claim review, localized correction, and team approval">
          <img className="process-art" src="/brand/reloop-process-loop.png" alt="" />
          <Link className="process-node process-report" href="/feedback">Customer report</Link>
          <Link className="process-node process-review" href="/investigation">Claim review</Link>
          <Link className="process-node process-correction" href="/fix-approve">Localized correction</Link>
          <Link className="process-node process-approval" href="/fix-approve">Team approval</Link>
        </div>
      </section>

      <section className="section brand-product-section" id="product">
        <div className="section-head">
          <div><div className="eyebrow"><span className="eyebrow-dot"/>A connected review loop</div><h2 className="display">Clear context at every step.</h2></div>
          <p className="section-intro">Bring the original customer message, the relevant product evidence, and the destination listing into one reviewable workflow.</p>
        </div>
        <div className="feature-grid">
          <div className="feature-card"><div className="feature-icon"><Icon name="inbox" size={18}/></div><h3>Capture feedback</h3><p>Keep the complaint, language, SKU, and marketplace together as a case.</p></div>
          <div className="feature-card"><div className="feature-icon"><Icon name="search" size={18}/></div><h3>Review claim gaps</h3><p>Compare the listing language with supplied specifications and source material.</p></div>
          <div className="feature-card"><div className="feature-icon"><Icon name="shield" size={18}/></div><h3>Prepare a correction</h3><p>Draft localized copy and review each marketplace version before approval.</p></div>
        </div>
      </section>

      <section className="section brand-workflow-section" id="workflow">
        <div className="workflow">
          <img className="workflow-waveform" src="/brand/reloop-waveform.png" alt="" />
          <div className="workflow-copy"><div className="eyebrow"><span className="eyebrow-dot"/>Review, revise, approve</div><h2 className="display">From customer report to a clearer listing.</h2><p>ReLoop brings a team's review steps into view. Example content in this design lab is mock data and does not represent a production analysis.</p><Link className="btn btn-lime" href="/dashboard" style={{ marginTop: 12 }}>Explore the workspace <Icon name="arrow" size={15}/></Link></div>
          <div className="workflow-steps">
            <Link href="/feedback" className="workflow-step active"><span className="step-num">01</span><div><strong>Capture feedback</strong><small>Complaint, product, channel, language</small></div><Icon name="arrow" size={16}/></Link>
            <Link href="/investigation" className="workflow-step"><span className="step-num">02</span><div><strong>Review the claim</strong><small>Compare the copy and supporting material</small></div><Icon name="arrow" size={16}/></Link>
            <Link href="/fix-approve" className="workflow-step"><span className="step-num">03</span><div><strong>Prepare a revision</strong><small>Localized copy and merchant approval</small></div><Icon name="arrow" size={16}/></Link>
          </div>
        </div>
      </section>

      <footer className="marketing-footer" id="resources"><span>ReLoop AI · UI Design Lab</span><span>Visual prototype · Example content only</span></footer>
    </main>
  );
}
