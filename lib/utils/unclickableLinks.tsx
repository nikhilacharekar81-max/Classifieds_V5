import React from 'react';

/**
 * Parses and renders ad description text so that any web URLs, domains,
 * or links are rendered as unclickable plain text elements.
 */
export function renderUnclickableDescription(description: string): React.ReactNode {
  if (!description) {
    return <span className="text-slate-400 italic">No description provided.</span>;
  }

  // Regex for Markdown links: [Text](URL)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|www\.[^\s\)]+)\)/g;

  // Clean description of markdown links first by flattening to "Text (URL)"
  const cleanedDescription = description.replace(markdownLinkRegex, '$1 ($2)');

  // Regex for raw URLs (http, https, www, or domain.tld patterns)
  const rawUrlRegex = /(https?:\/\/[^\s,]+|www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s,.]*)?|[a-zA-Z0-9-]+\.(?:com|in|org|net|co\.in|edu|gov|io|me|dev|app|store)(?:\/[^\s,.]*)?)/gi;

  const lines = cleanedDescription.split('\n');

  return (
    <>
      {lines.map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        let lastIdx = 0;
        let match: RegExpExecArray | null;

        // Reset regex state for current line
        rawUrlRegex.lastIndex = 0;

        while ((match = rawUrlRegex.exec(line)) !== null) {
          const matchedUrl = match[0];
          const matchIndex = match.index;

          // Push plain text before the URL
          if (matchIndex > lastIdx) {
            parts.push(line.substring(lastIdx, matchIndex));
          }

          // Push UNCLICKABLE URL element
          parts.push(
            <span
              key={`unclickable-link-${lineIdx}-${matchIndex}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] select-all cursor-not-allowed transition-all"
              title="Live links are disabled in ad descriptions for anti-spam compliance"
            >
              <span className="text-slate-400 font-sans text-[10px]">🔗</span>
              <span className="underline decoration-dotted text-slate-800 dark:text-slate-200 font-semibold">{matchedUrl}</span>
              <span className="ml-0.5 px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-sans font-bold uppercase tracking-wider border border-amber-300/50">
                Link Disabled
              </span>
            </span>
          );

          lastIdx = matchIndex + matchedUrl.length;
        }

        // Push remaining line text
        if (lastIdx < line.length) {
          parts.push(line.substring(lastIdx));
        }

        return (
          <React.Fragment key={`desc-line-${lineIdx}`}>
            {lineIdx > 0 && <br />}
            {parts.map((part, pIdx) =>
              typeof part === 'string' ? part : <React.Fragment key={`part-${pIdx}`}>{part}</React.Fragment>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
