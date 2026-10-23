"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/controls";

const STAGES = ["LEAD", "QUALIFIED", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

const STAGE_TONE: Record<string, string> = {
  LEAD: "#22d3ee",
  QUALIFIED: "#8b93ff",
  DISCOVERY: "#a78bfa",
  PROPOSAL: "#f472b6",
  NEGOTIATION: "#fbbf24",
  CLOSED_WON: "#34d399",
  CLOSED_LOST: "#f87171",
};

export function DealStageCell({ dealId, stage }: { dealId: string; stage: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const change = async (to: string) => {
    if (to === stage || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/revenue/deals/${dealId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage: to }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_TONE[stage] ?? "#8d8da0" }} />
      <Select value={stage} onChange={change} options={STAGES.map((s) => ({ value: s, label: s.replace("_", " ") }))} className="h-7 w-32" />
    </span>
  );
}