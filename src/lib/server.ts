export const ADMIN_COOKIE = "lff_admin_token";

// Tolerate a BACKEND_URL written without a scheme (e.g. "my-api.vercel.app") or with a trailing slash.
function normalizeUrl(raw: string | undefined) {
  let url = (raw ?? "http://localhost:4000").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `${/^(localhost|127\.0\.0\.1)/i.test(url) ? "http" : "https"}://${url}`;
  return url;
}
export const BACKEND_URL = normalizeUrl(process.env.BACKEND_URL);
