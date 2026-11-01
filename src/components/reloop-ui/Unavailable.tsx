export function Unavailable({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="unavailable-panel"><strong>{title}</strong><p>{children}</p></div>;
}
