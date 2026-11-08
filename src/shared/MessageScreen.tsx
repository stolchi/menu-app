/** A whole screen saying what went wrong, and what can be done about it. */
export function MessageScreen({
  title,
  hint,
  action,
  onAction,
}: {
  title: string;
  hint?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      {hint && <p className="text-muted-foreground">{hint}</p>}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 h-12 rounded-2xl bg-primary px-6 font-semibold text-primary-foreground"
        >
          {action}
        </button>
      )}
    </main>
  );
}
