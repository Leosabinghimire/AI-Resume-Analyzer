"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { safeNextPath } from "@/features/auth/schemas";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <LoginForm
      sessionExpired={params.get("expired") === "1"}
      onSuccess={() => router.replace(safeNextPath(params.get("next")))}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
