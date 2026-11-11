import { dateBR, dateLong, dateRange, nightsBetween, weekdayName } from "@/lib/format";
import { ITINERARY_KINDS } from "@/lib/labels";
import type { ItineraryFull, Profile } from "@/lib/types";

// Documento do roteiro (usado na tela, no PDF e dentro da proposta).
export function ItineraryDocument({
  itinerary,
  brand,
  customerName,
  showCover = true,
}: {
  itinerary: ItineraryFull;
  brand: Pick<Profile, "agency_name" | "brand_color" | "tagline" | "logo_url">;
  customerName?: string | null;
  showCover?: boolean;
}) {
  const nights = nightsBetween(itinerary.start_date, itinerary.end_date);
  return (
    <div className="space-y-6">
      {showCover && (
        <div
          className="avoid-break relative overflow-hidden rounded-2xl p-8 text-white sm:p-10"
          style={{ background: `linear-gradient(135deg, ${brand.brand_color}, #1b3055 70%, #2c5088)` }}
        >
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/20" aria-hidden="true" />
          <p className="relative text-xs uppercase tracking-[0.25em] text-sky-200">Roteiro de viagem</p>
          <h2 className="relative mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{itinerary.title}</h2>
          {itinerary.destination && <p className="relative mt-2 text-lg text-sky-100">📍 {itinerary.destination}</p>}
          <div className="relative mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-navy-100">
            <span>🗓️ {dateRange(itinerary.start_date, itinerary.end_date)}</span>
            {nights && <span>🌙 {nights} noite{nights > 1 ? "s" : ""}</span>}
            {customerName && <span>👤 Preparado para {customerName}</span>}
          </div>
          <div className="relative mt-8 flex items-center gap-3 border-t border-white/20 pt-4">
            {brand.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo_url} alt="" className="h-8 w-auto rounded bg-white/90 p-1" />
            )}
            <div>
              <p className="text-sm font-semibold">{brand.agency_name || "Sua assessoria de viagens"}</p>
              {brand.tagline && <p className="text-xs text-navy-200">{brand.tagline}</p>}
            </div>
          </div>
        </div>
      )}

      {itinerary.summary && (
        <div className="avoid-break rounded-2xl border border-navy-100 bg-white p-5">
          <h3 className="text-lg font-semibold text-navy-900">Visão geral</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-700">{itinerary.summary}</p>
        </div>
      )}

      {itinerary.days.map((d, idx) => (
        <section key={d.id} className="rounded-2xl border border-navy-100 bg-white">
          <header className="avoid-break flex flex-wrap items-center gap-4 border-b border-navy-100 p-4">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={{ background: brand.brand_color }}>
              <span className="text-[10px] uppercase tracking-wide text-sky-200">Dia</span>
              <span className="font-display text-xl font-semibold leading-none">{idx + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-navy-900">{d.title || `Dia ${idx + 1}`}</h3>
              <p className="text-xs text-navy-500">
                {d.day_date ? `${weekdayName(d.day_date)}, ${dateLong(d.day_date)}` : "Data a definir"}
                {d.location ? ` · 📍 ${d.location}` : ""}
              </p>
            </div>
          </header>
          <div className="space-y-1 p-4">
            {d.notes && <p className="mb-3 whitespace-pre-line text-sm text-navy-600">{d.notes}</p>}
            {d.items.length === 0 && <p className="text-sm text-navy-400">Dia livre.</p>}
            <ol className="space-y-3">
              {d.items.map((i) => (
                <li key={i.id} className="avoid-break flex gap-3">
                  <div className="w-14 shrink-0 pt-0.5 text-right text-sm font-semibold text-sky-700">{i.item_time || ""}</div>
                  <div className="relative flex-1 border-l-2 border-sky-200 pb-1 pl-4">
                    <span className="absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[11px]">
                      {ITINERARY_KINDS[i.kind].icon}
                    </span>
                    <p className="text-sm font-semibold text-navy-900">
                      {i.title} <span className="text-xs font-normal text-navy-400">· {ITINERARY_KINDS[i.kind].label}</span>
                    </p>
                    {i.location && <p className="text-xs text-navy-500">📍 {i.location}</p>}
                    {i.description && <p className="mt-1 whitespace-pre-line text-sm text-navy-700">{i.description}</p>}
                    {i.tips && (
                      <p className="mt-1.5 rounded-md bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">💡 {i.tips}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-navy-400">
        Roteiro elaborado por {brand.agency_name || "sua assessoria"}. Horários e valores podem sofrer alterações. {itinerary.start_date ? `Início em ${dateBR(itinerary.start_date)}.` : ""}
      </p>
    </div>
  );
}
