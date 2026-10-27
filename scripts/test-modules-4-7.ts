// Testes (sem rede, sem chaves) dos módulos 4 a 7 e dos alertas. Rode com: npm run test:logic
import assert from "node:assert/strict";
import { decideAlert, parseAlertInput } from "../lib/alerts";
import { feeLinesFromBooking, mergeFeeLines, parseMoney } from "../lib/analysis/booking";
import { compareFees, computeFeeBreakdown } from "../lib/analysis/fees";
import { analyzeHiddenCity } from "../lib/analysis/hidden";
import { analyzeRisk, EMPTY_RULES, rankRisk } from "../lib/analysis/risk";
import { addDays, todayISO } from "../lib/dates";
import { extractJson } from "../lib/ai";
import { filterOffers, parseFareRules, parseFeeLines } from "../lib/research";
import { runHiddenCitySearch } from "../lib/search";
import { parseHidden } from "../lib/validate";
import type { FareOption, FeeLine, Flight } from "../lib/types";

delete process.env.SERPAPI_KEY;

const fare = (id: string, price: number, extra: Partial<FareOption> = {}): FareOption => ({
  id, label: id, airline: "X", price, currency: "BRL", adults: 2, roundTrip: true, stops: 1,
  shortestLayoverMin: 120, multiCarrier: false, baggageIncluded: null, fromCart: false, ...extra,
});

async function main() {
  // ---- parseMoney
  assert.equal(parseMoney("R$ 1.234,56"), 1234.56);
  assert.equal(parseMoney("$1,234.56"), 1234.56);
  assert.equal(parseMoney("1st checked bag: BRL 120"), 120);
  assert.equal(parseMoney("Bagagem de mão incluída"), null);

  // ---- módulo 5: taxas
  const lines: FeeLine[] = [
    { key: "bagagem_despachada", label: "Bag", status: "opcional", amount: 100, basis: "por_trecho", origin: "manual" },
    { key: "assento", label: "Assento", status: "opcional", amount: null, basis: "por_trecho", origin: "ia" },
    { key: "forma_pagamento", label: "Pgto", status: "inevitavel", amount: 30, basis: "por_viagem", origin: "manual" },
  ];
  const cheap = computeFeeBreakdown(fare("barata", 2000), lines, { bagagem_despachada: true });
  // 2000 + bagagem 100*2pax*2trechos=400 + inevitável 30*2pax=60
  assert.equal(cheap.finalPrice, 2460);
  assert.equal(cheap.complete, true);
  const withSeat = computeFeeBreakdown(fare("barata", 2000), lines, { assento: true });
  assert.equal(withSeat.complete, false, "valor desconhecido nunca vira zero");
  assert.equal(withSeat.unknownCount, 1);
  const incl = computeFeeBreakdown(fare("cara", 2300, { baggageIncluded: true }), lines, { bagagem_despachada: true });
  assert.equal(incl.finalPrice, 2360);
  const cmp = compareFees([cheap, incl], (n) => String(n));
  assert.equal(cmp.inverted, true, "a mais barata anunciada deixa de ser a mais barata no final");
  assert.equal(cmp.cheapestFinal?.fare.id, "cara");

  // ---- módulo 6: risco
  const rulesNo = { ...EMPTY_RULES, refundable: "nao" as const, changeAllowed: "nao" as const, baggageAirportFee: 200, baggageOnlineFee: 100 };
  const risky = analyzeRisk(fare("barata", 2000), rulesNo, { pChange: 0.2, needsBaggageLater: true });
  assert.equal(risky.complete, true);
  assert.equal(risky.expectedCost, 2800); // 2000 + 20% × 2000 + (200−100)×2 trechos×2 pax
  const unknown = analyzeRisk(fare("x", 1500), EMPTY_RULES, { pChange: 0.2, needsBaggageLater: false });
  assert.equal(unknown.complete, false);
  assert.equal(unknown.expectedCost, null, "sem regras não há custo esperado inventado");
  assert.ok(unknown.scenarios.some((s) => s.key === "cancelar" && s.loss === null));
  const flex = analyzeRisk(fare("flex", 2400), { ...EMPTY_RULES, refundable: "sim", refundPct: 100, cancelFee: 0, changeAllowed: "sim", changeFee: 0, baggageAirportFee: 0, baggageOnlineFee: 0 }, { pChange: 0.2, needsBaggageLater: false });
  assert.equal(flex.expectedCost, 2400);
  const rk = rankRisk([risky, flex, unknown]);
  assert.equal(rk.best?.fare.id, "flex");
  assert.equal(rk.cheapest?.fare.id, "x");
  assert.equal(rk.ordered[rk.ordered.length - 1].fare.id, "x");

  // ---- IA: filtro anti-invenção
  const retrieved = new Set(["https://latam.com/promo"]);
  const today = todayISO();
  const base = { title: "10% off", kind: "cupom", source_url: "https://latam.com/promo", source_title: "LATAM", source_kind: "oficial", requirements: "Cadastro", restrictions: "", valid_until: addDays(today, 5), evidence: "10% de desconto" };
  const f = filterOffers([
    base,
    { ...base, title: "vencido", valid_until: addDays(today, -1) },
    { ...base, title: "sem link", source_url: "" },
    { ...base, title: "link inventado", source_url: "https://inventado.com/x" },
    { ...base, title: "terceiro", source_kind: "terceiro" },
    { ...base, title: "sem validade", valid_until: null },
    "lixo",
  ], retrieved, today);
  assert.equal(f.offers.length, 2);
  assert.deepEqual(f.discarded, { expired: 1, noSource: 1, unretrievedUrl: 1, thirdParty: 1, invalid: 1 });
  assert.equal(f.offers.find((o) => o.title === "sem validade")?.validUntil, null);

  const fl = parseFeeLines([
    { key: "bagagem_despachada", status: "opcional", amount: 150, source_url: "https://latam.com/promo", source_title: "L" },
    { key: "assento", status: "opcional", amount: 40, source_url: "https://naoconsultou.com" },
  ], retrieved);
  assert.equal(fl[0].amount, 150);
  assert.equal(fl[1].amount, null, "valor sem fonte consultada é descartado");
  assert.equal(fl[1].status, "nao_informado");
  const noSrc = parseFareRules({ refund_pct: 50, change_fee: 300, refundable: "parcial", sources: [] }, retrieved);
  assert.equal(noSrc.refundPct, null);
  assert.equal(noSrc.refundable, "nao_informado");
  const withSrc = parseFareRules({ refund_pct: 150, change_fee: 300, sources: [{ source_url: "https://latam.com/promo", source_title: "L" }] }, retrieved);
  assert.equal(withSrc.refundPct, 100);
  assert.equal(withSrc.changeFee, 300);
  assert.deepEqual(extractJson('texto ```json\n{"a":1}\n``` fim'), { a: 1 });
  assert.throws(() => extractJson("sem json"));

  // ---- booking: texto de bagagem
  const bl = feeLinesFromBooking([], ["Carry-on bag: included", "1st checked bag: R$ 120", "2nd checked bag: R$ 200"], fare("b", 1));
  assert.equal(bl.find((l) => l.key === "bagagem_de_mao")?.status, "incluido");
  assert.equal(bl.find((l) => l.key === "bagagem_despachada")?.amount, 120);
  const merged = mergeFeeLines([[{ ...bl[0], origin: "serpapi" }], [{ ...bl[0], origin: "manual", amount: 99 }]]);
  assert.equal(merged.find((l) => l.key === "bagagem_despachada")?.amount, 99, "manual vence");

  // ---- módulo 7: hidden-city
  const mk = (id: string, price: number, via: string, end: string): Flight => ({
    id, price, currency: "BRL", airlines: ["A"], durationMin: 600, stops: 1, origin: "GRU", destination: end,
    departure: "2030-01-01 08:00", arrival: "2030-01-01 20:00", extensions: [], airportChange: false, overnightLayover: false,
    longestLayoverMin: 90, lowCost: false, baggage: { status: "nao_informada", text: "" },
    layovers: [{ airport: via, name: via, durationMin: 90 }],
    segments: [
      { airline: "A", flightNumber: "1", from: "GRU", fromName: "", to: via, toName: "", departure: "2030-01-01 08:00", arrival: "2030-01-01 14:00", durationMin: 360 },
      { airline: "A", flightNumber: "2", from: via, fromName: "", to: end, toName: "", departure: "2030-01-01 15:30", arrival: "2030-01-01 20:00", durationMin: 150 },
    ],
  });
  const baseline = mk("base", 3000, "PTY", "JFK");
  const h = analyzeHiddenCity(
    [mk("ok", 2500, "JFK", "BOS"), mk("caro", 3500, "JFK", "BOS"), mk("outro-hub", 2000, "MIA", "BOS"), mk("pousa", 1000, "PTY", "JFK")],
    { stopover: "JFK", baseline, limit: 5 },
  );
  assert.deepEqual(h.map((o) => o.flight.id), ["ok"], "só entra quem passa pelo aeroporto e é mais barato");
  assert.equal(h[0].savings, 500);
  assert.deepEqual(analyzeHiddenCity([mk("ok", 2500, "JFK", "BOS")], { stopover: "JFK", baseline: null }), []);

  const out = addDays(today, 40);
  assert.equal(parseHidden({ origin: "GRU", destination: "JFK", outDate: out, returnDate: addDays(out, 7) }).ok, false, "volta é recusada");
  assert.equal(parseHidden({ origin: "GRU", destination: "JFK,EWR", outDate: out }).ok, false);
  const ph = parseHidden({ origin: "GRU", destination: "JFK", outDate: out });
  assert.ok(ph.ok);
  if (ph.ok) {
    const r7 = await runHiddenCitySearch(ph.value);
    assert.equal(r7.meta.mock, true);
    assert.ok(r7.checkedCandidates > 0);
    for (const o of r7.options) {
      assert.ok(o.savings > 0 && o.flight.layovers.some((l) => l.airport === "JFK"));
    }
    console.log("M7 (exemplo):", r7.options.length, "opção(ões)");
  }
  const noList = parseHidden({ origin: "GRU", destination: "XYZ", outDate: out });
  if (noList.ok) await assert.rejects(runHiddenCitySearch(noList.value), /Informe/);

  // ---- alertas
  const st = { target_price: 3000, min_drop_pct: 10, last_price: 4000, last_notified_price: null };
  assert.equal(decideAlert(st, 2900).kind, "alvo");
  assert.equal(decideAlert(st, 3500).kind, "queda");
  assert.equal(decideAlert(st, 3900).notify, false);
  assert.equal(decideAlert({ ...st, last_notified_price: 2900 }, 2900).notify, false, "não repete o mesmo preço");
  assert.equal(decideAlert({ ...st, last_notified_price: 2900 }, 2800).notify, true);
  const up = decideAlert({ ...st, last_notified_price: 2900 }, 3100);
  assert.equal(up.resetNotified, true);
  const ok = parseAlertInput({ label: "A", origin: "gru", destination: "lis", outDate: out, notifyEmail: "a@b.com", targetPrice: "3000", minDropPct: 5 });
  assert.ok(ok.ok);
  assert.equal(parseAlertInput({ label: "A", origin: "GRU", destination: "LIS", outDate: out, notifyEmail: "ruim" }).ok, false);
  assert.equal(parseAlertInput({ label: "A", origin: "GRU", destination: "LIS", outDate: out, notifyEmail: "a@b.com", minDropPct: 0 }).ok, false);
  assert.equal(parseAlertInput({ label: "A", origin: "GRU", destination: "LIS", outDate: "2020-01-01", notifyEmail: "a@b.com" }).ok, false);

  console.log("OK — módulos 4 a 7 e alertas validados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
