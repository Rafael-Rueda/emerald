export function generateVersionKeyFromLabel(label: string): string {
  const trimmed = label.trim();

  if (!trimmed) {
    return "";
  }

  const compactVersionMatch = trimmed.match(/^v\s*(\d+)$/i);
  if (compactVersionMatch?.[1]) {
    return `v${compactVersionMatch[1]}`;
  }

  const versionMatch = trimmed.match(/\bversion\s*(\d+)\b/i);
  if (versionMatch?.[1]) {
    return `v${versionMatch[1]}`;
  }

  const normalized = trimmed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!normalized) {
    return "";
  }

  if (/^\d+$/.test(normalized)) {
    return `v${normalized}`;
  }

  return normalized;
}
