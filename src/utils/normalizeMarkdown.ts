/**
 * Fixes common LLM output where headings/lists run into prior sentences without blank lines.
 */
export function normalizeMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return text;

  text = text.replace(/([.:!?])\s*(#{1,6}\s)/g, '$1\n\n$2');
  text = text.replace(/:\s*(#{1,6}\s)/g, ':\n\n$1');
  text = text.replace(/([^\n])\s*(\*\*\d+\.)/g, '$1\n\n$2');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}
