let accessToken: string | null = null;
const subs = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  subs.forEach((s) => s());
}

export function subscribeAccessToken(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}
