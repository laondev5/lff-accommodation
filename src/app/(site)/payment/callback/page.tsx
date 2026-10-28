"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";

function Callback() {
  const sp = useSearchParams();
  const router = useRouter();
  const reference = sp.get("reference") ?? sp.get("trxref");
  const [state, setState] = useState<"checking" | "failed" | "pending">("checking");
  const [message, setMessage] = useState<string>();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!reference) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("failed");
      setMessage("No payment reference found.");
      return;
    }
    api("public/payments/verify", { method: "POST", body: { reference } })
      .then((res) => {
        if (res.status === "success" && res.booking?.profileToken) router.replace(`/booking/${res.booking.profileToken}`);
        else if (res.status === "failed") setState("failed");
        else setState("pending");
      })
      .catch((e) => {
        setState("failed");
        setMessage(e.message);
      });
  }, [reference, router]);

  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center">
      {state === "checking" && (
        <>
          <Spinner className="size-8" />
          <h1 className="text-xl font-semibold">Confirming your payment…</h1>
          <p className="text-muted-foreground">Please don't close this page.</p>
        </>
      )}
      {state === "pending" && (
        <>
          <CheckCircle2 className="size-10 text-amber-500" />
          <h1 className="text-xl font-semibold">We haven't received confirmation yet</h1>
          <p className="text-muted-foreground">If you were debited, your booking will be confirmed automatically and emailed to you shortly.</p>
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle className="size-10 text-destructive" />
          <h1 className="text-xl font-semibold">Payment not completed</h1>
          <p className="text-muted-foreground">{message ?? "Your payment was not successful. You have not been charged for this booking."}</p>
        </>
      )}
      {state !== "checking" && (
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
