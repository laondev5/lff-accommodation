import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, BACKEND_URL } from "@/lib/server";

// Only these backend areas are reachable from the browser. Third-party (/v1), cron and webhooks never go through here.
const ALLOWED = ["public/", "admin/", "auth/me", "auth/password", "pusher/auth"];

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = path.join("/");
  if (!ALLOWED.some((p) => target === p || target.startsWith(p))) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (token) headers.authorization = `Bearer ${token}`;

  const hasBody = !["GET", "HEAD"].includes(req.method);
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/${target}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ success: false, message: "Cannot reach the server. Please try again." }, { status: 502 });
  }

  const res = new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" } });
  // An expired/invalid admin token: drop the cookie so the proxy sends the user back to login.
  if (upstream.status === 401 && token && target.startsWith("admin/")) res.cookies.delete(ADMIN_COOKIE);
  return res;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
