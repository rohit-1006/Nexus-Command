"use client";

import * as React from "react";
import { Play, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WorkflowRunButton({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual", payload: {} }),
      });
      const data = await res.json();
      setResult(res.ok ? `Completed in ${data.durationMs ?? "?"}ms` : "Failed — see run history");
      router.refresh();
    } catch {
      setResult("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Run now
      </Button>
      {result && <span className="font-data text-[9px] text-mut">{result}</span>}
    </div>
  );
}