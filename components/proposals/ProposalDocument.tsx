import type { ReactNode } from "react";
import { ItineraryDocument } from "@/components/itineraries/ItineraryDocument";
import { perPerson } from "@/lib/calc";
import { dateBR, dateLong, dateRange, money, nightsBetween } from "@/lib/format";
import { CATEGORIES } from "@/lib/labels";
import { CATEGORY_ORDER } from "@/lib/calc";
import type { ProposalBundle } from "@/lib/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="avoid-break rounded-2xl border border-navy-100 bg-white p-5">
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Bullets({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.replace(/^[\s•*-]+/, "").trim()).filter(Boolean);
  return (
    <ul className="space-y-1.5 text-sm text-navy-700">
      {lines.map((l, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-sky-600">•</span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

// Documento da proposta: usado na visualização do consultor, no PDF e na página pública do cliente.
export function ProposalDocument({ bundle, children }: { bundle: ProposalBundle; children?: ReactNode }) {
  const { proposal, profile, customer, quotation: q, items, itinerary } = bundle;
  const color = profile.brand_color;
  const nights = q ? nightsBetween(q.start_date, q.end_date) : null;
  const currency = q?.currency ?? "BRL";
  const travelers = q ? q.adults + q.children : 0;
  const mode = proposal.price_display;

  const groups = CATEGORY_ORDER.map((category) => ({ category, items: items.filter((i) => i.category === category) })).filter((g) => g.items.length);
  const contact = [profile.phone, profile.email, profile.website, profile.instagram].filter(Boolean);

  return (
    <div className="space-y-6">
      <div
        className="avoid-break relative overflow-hidden rounded-2xl p-8 text-white sm:p-10"
        style={{ background: `linear-gradient(135deg, ${color}, #1b3055 70%, #2c5088)` }}
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-400/20" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          {profile.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt="" className="h-10 w-auto rounded bg-white/90 p-1" />
          )}
          <div>
            <p className="font-display text-lg font-semibold">{profile.agency_name || "Sua assessoria de viagens"}</p>
            {profile.tagline && <p className="text-xs text-sky-200">{profile.tagline}</p>}
          </div>
        </div>
        <p className="relative mt-8 text-xs uppercase tracking-[0.25em] text-sky-200">Proposta de viagem</p>
        <h2 className="relative mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{proposal.title}</h2>
        {q?.destination && <p className="relative mt-2 text-lg text-sky-100">📍 {q.destination}</p>}
        <div className="relative mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-navy-100">
          {customer && <span>👤 Para {customer.name}</span>}
          {q && <span>🗓️ {dateRange(q.start_date, q.end_date)}</span>}
          {nights && <span>🌙 {nights} noite{nights > 1 ? "s" : ""}</span>}
          {travelers > 0 && <span>🧳 {q!.adults} adulto{q!.adults > 1 ? "s" : ""}{q!.children ? ` e ${q!.children} criança${q!.children > 1 ? "s" : ""}` : ""}</span>}
        </div>
        {proposal.valid_until && <p className="relative mt-6 text-xs text-sky-200">Proposta válida até {dateLong(proposal.valid_until)}</p>}
      </div>

      {proposal.intro_message && (
        <Section title="Uma mensagem para você">
          <p className="whitespace-pre-line text-sm leading-relaxed text-navy-700">{proposal.intro_message}</p>
        </Section>
      )}

      {q && (
        <Section title="Investimento">
          {mode === "detalhado" && (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.category}>
                  <p className="mb-1 text-sm font-semibold text-navy-900">
                    {CATEGORIES[g.category].icon} {CATEGORIES[g.category].plural}
                  </p>
                  <ul className="divide-y divide-navy-100">
                    {g.items.map((i) => (
                      <li key={i.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-navy-900">
                            {i.description}
                            {i.quantity !== 1 && <span className="text-navy-500"> × {String(i.quantity).replace(".", ",")}</span>}
                          </p>
                          {(i.details || i.item_date) && (
                            <p className="text-xs text-navy-500">{[i.item_date ? dateBR(i.item_date) : null, i.details].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-medium text-navy-900">{money(i.line_price_cents, currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {mode === "por_categoria" && (
            <ul className="divide-y divide-navy-100">
              {groups.map((g) => (
                <li key={g.category} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="text-navy-900">
                    {CATEGORIES[g.category].icon} {CATEGORIES[g.category].plural}
                  </span>
                  <span className="font-medium text-navy-900">{money(g.items.reduce((s, i) => s + i.line_price_cents, 0), currency)}</span>
                </li>
              ))}
            </ul>
          )}
          {mode === "total" && groups.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2 text-sm text-navy-700">
              {groups.map((g) => (
                <li key={g.category} className="rounded-full bg-navy-50 px-3 py-1">
                  {CATEGORIES[g.category].icon} {CATEGORIES[g.category].plural}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-1 border-t border-navy-100 pt-3 text-sm">
            {mode !== "total" && q.service_fee_cents > 0 && (
              <div className="flex justify-between text-navy-700">
                <span>Assessoria / concierge</span>
                <span>{money(q.service_fee_cents, currency)}</span>
              </div>
            )}
            {mode !== "total" && q.discount_cents > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto</span>
                <span>− {money(q.discount_cents, currency)}</span>
              </div>
            )}
            <div className="flex items-end justify-between pt-1">
              <span className="text-base font-semibold text-navy-900">Total da viagem</span>
              <span className="font-display text-3xl font-semibold" style={{ color }}>
                {money(q.total_price_cents, currency)}
              </span>
            </div>
            {travelers > 1 && (
              <p className="text-right text-xs text-navy-500">≈ {money(perPerson(q.total_price_cents, q.adults, q.children), currency)} por pessoa</p>
            )}
          </div>
        </Section>
      )}

      {q && (q.inclusions || q.exclusions) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {q.inclusions && (
            <Section title="O que está incluído">
              <Bullets text={q.inclusions} />
            </Section>
          )}
          {q.exclusions && (
            <Section title="Não incluído">
              <Bullets text={q.exclusions} />
            </Section>
          )}
        </div>
      )}

      {q?.payment_terms && (
        <Section title="Condições de pagamento">
          <p className="whitespace-pre-line text-sm text-navy-700">{q.payment_terms}</p>
        </Section>
      )}

      {itinerary && (
        <div className="page-break">
          <h3 className="mb-3 font-display text-2xl font-semibold text-navy-900">Seu roteiro</h3>
          <ItineraryDocument itinerary={itinerary} brand={{ ...profile, brand_color: color }} customerName={customer?.name} showCover={false} />
        </div>
      )}

      {proposal.terms && (
        <Section title="Termos e condições">
          <p className="whitespace-pre-line text-xs leading-relaxed text-navy-600">{proposal.terms}</p>
        </Section>
      )}

      {children}

      <footer className="avoid-break rounded-2xl p-5 text-center text-white" style={{ background: color }}>
        <p className="font-display text-lg font-semibold">{profile.agency_name || "Sua assessoria de viagens"}</p>
        {profile.full_name && <p className="text-sm text-sky-100">{profile.full_name}</p>}
        {contact.length > 0 && <p className="mt-1 text-xs text-sky-100">{contact.join("  ·  ")}</p>}
      </footer>
    </div>
  );
}
