import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_CASE_ID } from "@/lib/fixtures/demo";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReLoop AI · Claim to Action",
  description: "Evidence-linked customer resolution and cross-platform listing correction.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <Link className="brand" href="/" aria-label="ReLoop AI 首页"><span className="brand-mark">R</span><span>ReLoop <small>AI</small></span></Link>
            <p className="sidebar-caption">CLAIM → ACTION</p>
            <nav aria-label="主导航 / Main navigation">
              <Link href="/"><span>01</span> 反馈收件箱 <small>Feedback Inbox</small></Link>
              <Link href={`/cases/${DEMO_CASE_ID}`}><span>02</span> 承诺核验 <small>Claim Investigation</small></Link>
              <Link href={`/cases/${DEMO_CASE_ID}/fix`}><span>03</span> 修订与审核 <small>Fix & Approve</small></Link>
            </nav>
            <div className="sidebar-note">一个案例，协同处理。<br /><small>One case. Connected action.</small></div>
          </aside>
          <div className="main-shell">
            <header className="topbar"><span>宁波出口商工作台 <small>Merchant workspace</small></span><span className="badge">基础预览 / Foundation</span></header>
            <main id="main-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
