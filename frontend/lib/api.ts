function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:8000";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const API_URL = normalizeApiUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
);
