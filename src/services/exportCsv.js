function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportCsv(filename, headers, rows) {
  const headerLine = headers.map((header) => csvCell(header.label)).join(',');
  const bodyLines = rows.map((row) =>
    headers.map((header) => csvCell(header.value(row))).join(',')
  );
  const csv = `\uFEFF${[headerLine, ...bodyLines].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
