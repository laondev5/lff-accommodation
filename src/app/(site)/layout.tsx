import Link from "next/link";
import { Logo } from "@/components/logo";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "LFF Accommodation";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-b-brand-orange/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-base font-bold tracking-tight text-primary">
            <Logo size={60} />
            {appName}
          </Link>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Staff login
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">© {appName}</footer>
    </>
  );
}
