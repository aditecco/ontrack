"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function RedirectToReports() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  useEffect(() => {
    router.replace(id ? `/reports?id=${id}` : "/reports");
  }, [id, router]);

  return null;
}

export default function ReportViewPage() {
  return (
    <Suspense>
      <RedirectToReports />
    </Suspense>
  );
}
