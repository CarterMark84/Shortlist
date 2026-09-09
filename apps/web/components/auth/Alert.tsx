/**
 * Inline form feedback. `role="alert"` so screen readers announce it without
 * the user having to hunt for what went wrong.
 */
export function Alert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles =
    tone === 'error' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success';

  return (
    <p role="alert" className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${styles}`}>
      {children}
    </p>
  );
}
