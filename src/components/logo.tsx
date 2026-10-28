import Image from "next/image";
import { cn } from "@/lib/utils";

/** The church logo. `tile` puts it on a white rounded tile so it stays legible on dark backgrounds. */
export function Logo({ size = 36, tile, className }: { size?: number; tile?: boolean; className?: string }) {
  const img = <Image src="/logo-sm.png" alt="Living Faith Foundation" width={size} height={Math.round(size * 0.75)} priority className="h-auto object-contain" style={{ width: size, height: "auto" }} />;
  if (!tile) return <span className={cn("inline-flex shrink-0", className)}>{img}</span>;
  return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm", className)}>{img}</span>;
}
