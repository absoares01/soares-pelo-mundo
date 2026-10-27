"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlternativesResults } from "@/components/results/AlternativesResults";
import { DiscountsResults } from "@/components/results/DiscountsResults";
import { HiddenResults } from "@/components/results/HiddenResults";
import { DatesResults } from "@/components/results/DatesResults";
import { RoutesResults } from "@/components/results/RoutesResults";
import { Notice, PageTitle, Spinner } from "@/components/ui";
import { formatSearchedAt } from "@/lib/format";
import type { AlternativesResult, DatesResult, DiscountsResult, HiddenCityResult, RoutesResult } from "@/lib/types";

interface Saved {
  id: string;
  module: string;
  title: string;
  result: unknown;
  created_at: string;
}

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/history/${id}`)
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as { search?: Saved; error?: string };
        if (!r.ok || !d.search) throw new Error(d.error ?? "Busca não encontrada.");
        setSaved(d.search);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <Notice tone="red">{error}</Notice>;
  if (!saved) return <Spinner />;

  return (
    <div className="space-y-5">
      <PageTitle title={saved.title} subtitle={`Busca salva em ${formatSearchedAt(saved.created_at)}. Os preços podem ter mudado desde então.`} />
      {saved.module === "datas" && <DatesResults result={saved.result as DatesResult} />}
      {saved.module === "ocultos" && <AlternativesResults result={saved.result as AlternativesResult} />}
      {saved.module === "escalas" && <RoutesResults result={saved.result as RoutesResult} />}
      {saved.module === "descontos" && <DiscountsResults result={saved.result as DiscountsResult} />}
      {saved.module === "hidden-city" && <HiddenResults result={saved.result as HiddenCityResult} />}
    </div>
  );
}
