import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/server";

// Gate the admin area: no session cookie -> login. (The backend re-validates the JWT on every admin API call.)
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(ADMIN_COOKIE);
  const isLogin = pathname === "/admin/login";

  if (!hasSession && !isLogin) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && isLogin) return NextResponse.redirect(new URL("/admin", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
