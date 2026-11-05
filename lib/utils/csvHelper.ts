/**
 * Neutralizes CSV formula injection vulnerabilities (Excel / Google Sheets / LibreOffice).
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', prefixes with a single quote "'"
 * to force spreadsheet programs to treat the cell value strictly as literal text.
 * Properly wraps cells with quotes, commas, newlines, or leading quotes in double-quotes with escaping.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Neutralize formula triggers at the start of cell
  const trimmed = str.trimStart();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    str = "'" + str;
  }

  // Quote if string contains quotes, commas, newlines, carriage returns, or single quote prefix
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds sanitized CSV string from headers and 2D row array.
 */
export function buildCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(sanitizeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\n');
}
