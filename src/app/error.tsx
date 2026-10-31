"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="panel" role="alert"><h1>暂时无法加载 / Unable to load</h1><p>请重试。重试不会提交新的修订。Retrying will not submit a revision.</p><button onClick={reset} type="button">重试 / Retry</button></div>;
}
