function sanitize(html: string) {
  // Minimal sanitation: strip script/style/iframe tags and inline event handlers.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "");
}

export function ArticleLesson({ html }: { html: string | null | undefined }) {
  if (!html) return <p className="text-sm text-ink-muted">No article content yet.</p>;
  return (
    <div
      className="prose prose-sm sm:prose-base max-w-none text-ink [&_a]:text-brand [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_strong]:text-ink"
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}
