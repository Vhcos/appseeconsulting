export default function Explainer({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer select-none text-sm font-medium">
        {title}
      </summary>
      <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </details>
  );
}
