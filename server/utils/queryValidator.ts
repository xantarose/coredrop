export function sanitizeQueryParam(value: unknown, maxLen = 50): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function validateRefCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 30) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function validateUTMParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function validateTabParam(value: unknown, allowed: string[]): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!allowed.includes(trimmed)) return null;
  return trimmed;
}

export function validateShareToken(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[a-f0-9]{64}$/.test(value);
}

export function validateResetToken(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  return /^[A-Za-z0-9\-_.]+$/.test(value);
}
