import Link from "next/link";

export default function NotFound() {
  return <div className="panel"><p className="eyebrow">404</p><h1>未找到案例 / Case not found</h1><p>请返回收件箱选择已有案例。</p><Link className="text-link" href="/">返回收件箱 / Back to inbox →</Link></div>;
}
