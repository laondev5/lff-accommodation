import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, BACKEND_URL } from "@/lib/server";

export async function POST(req: NextRequest) {
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ success: false, message: "Cannot reach the server. Please try again." }, { status: 502 });
  }
  const json = await upstream.json().catch(() => ({ success: false, message: "Unexpected response" }));
  if (!upstream.ok) return NextResponse.json(json, { status: upstream.status });

  const res = NextResponse.json({ success: true, data: { admin: json.data.admin } });
  res.cookies.set(ADMIN_COOKIE, json.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
