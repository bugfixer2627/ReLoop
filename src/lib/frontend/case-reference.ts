/** A compact display reference that remains distinguishable when UUID prefixes are shared. */
export function caseReference(id: string) {
  if (id.length <= 16) return id.toUpperCase();
  return `CASE-${id.slice(-6).toUpperCase()}`;
}
