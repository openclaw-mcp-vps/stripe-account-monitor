"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccessClaimForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/stripe/claim", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to verify purchase");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while claiming access. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        className="h-11 border-white/20 bg-[#0f1622] text-white placeholder:text-slate-500"
      />
      <Button
        type="submit"
        disabled={pending}
        className="h-11 bg-emerald-500 text-slate-900 hover:bg-emerald-400"
      >
        {pending ? "Verifying..." : "Unlock Dashboard"}
      </Button>
      {error ? <p className="text-sm text-red-400 sm:col-span-2">{error}</p> : null}
    </form>
  );
}
