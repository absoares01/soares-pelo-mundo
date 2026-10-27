import type { FareOption, FareRules, RiskAnalysis, RiskScenario } from "../types";
import { legsOf } from "./fees";

// Módulo 6 — risco real da tarifa barata. Os prejuízos são calculados em
// código a partir das regras informadas (com fonte ou digitadas). Quando a regra
// não é conhecida, o cenário fica "não calculável": nunca vira zero.

export const EMPTY_RULES: FareRules = {
  changeAllowed: "nao_informado",
  changeFee: null,
  refundable: "nao_informado",
  refundPct: null,
  cancelFee: null,
  noShowRule: "Não informado pela fonte.",
  creditValidityMonths: null,
  baggageOnlineFee: null,
  baggageAirportFee: null,
  restrictions: [],
  sources: [],
  origin: "manual",
};

export function analyzeRisk(
  fare: FareOption,
  rules: FareRules,
  opts: { pChange: number; needsBaggageLater: boolean },
): RiskAnalysis {
  const legs = legsOf(fare);
  const n = fare.adults;
  const price = fare.price;
  const scenarios: RiskScenario[] = [];

  // --- Cancelar
  let cancelLoss: number | null = null;
  let cancelDetail: string;
  if (rules.refundPct !== null) {
    const refund = Math.max(0, (price * rules.refundPct) / 100 - (rules.cancelFee ?? 0) * n);
    cancelLoss = price - refund;
    cancelDetail = `Reembolso de ${rules.refundPct}% da tarifa${rules.cancelFee ? ` menos multa de ${rules.cancelFee} por passageiro` : ""}.`;
  } else if (rules.refundable === "nao") {
    cancelLoss = price;
    cancelDetail = "Tarifa não reembolsável: perde-se o valor pago (taxas de embarque podem ser devolvidas; confirmar).";
  } else if (rules.refundable === "sim" && rules.cancelFee !== null) {
    cancelLoss = rules.cancelFee * n;
    cancelDetail = "Reembolsável, com multa de cancelamento informada.";
  } else if (rules.refundable === "sim") {
    cancelDetail = "Reembolsável, mas a multa de cancelamento não foi informada.";
  } else if (rules.refundable === "parcial") {
    cancelDetail = "Reembolso parcial, sem percentual informado.";
  } else {
    cancelDetail = "Regra de reembolso não informada pela fonte — confirmar com a companhia.";
  }
  scenarios.push({ key: "cancelar", label: "Precisar cancelar", loss: cancelLoss, detail: cancelDetail });

  // --- Mudar datas
  let changeLoss: number | null = null;
  let changeDetail: string;
  if (rules.changeAllowed === "nao") {
    changeLoss = price;
    changeDetail = "Não permite alteração: seria preciso comprar outra passagem (a perda pode ser menor se houver crédito).";
  } else if (rules.changeAllowed === "sim" && rules.changeFee !== null) {
    changeLoss = rules.changeFee * n;
    changeDetail = "Multa de alteração informada, mais a diferença de tarifa na nova data (não dá para calcular antes).";
  } else if (rules.changeAllowed === "sim") {
    changeDetail = "Permite alterar, mas a multa não foi informada.";
  } else {
    changeDetail = "Regra de alteração não informada pela fonte — confirmar com a companhia.";
  }
  scenarios.push({ key: "mudar_datas", label: "Mudar as datas", loss: changeLoss, detail: changeDetail });

  // --- Perder conexão (qualitativo: depende de bilhete único ou separado)
  let connLoss: number | null = null;
  let connDetail: string;
  if (fare.stops === 0) {
    connLoss = 0;
    connDetail = "Voo direto: não há conexão para perder.";
  } else {
    const parts: string[] = [];
    if (fare.multiCarrier) {
      parts.push("Companhias diferentes no itinerário: confirme se é bilhete único. Em bilhetes separados, perder a conexão pode significar comprar o trecho seguinte do zero.");
    } else {
      parts.push("Mesma companhia: em bilhete único, a companhia costuma reacomodar o passageiro, mas as regras variam.");
    }
    if (fare.shortestLayoverMin !== null && fare.shortestLayoverMin < 90) {
      parts.push(`Conexão curta (${fare.shortestLayoverMin} min) aumenta o risco.`);
    }
    connDetail = parts.join(" ");
  }
  scenarios.push({ key: "perder_conexao", label: "Perder uma conexão", loss: connLoss, detail: connDetail });

  // --- Adicionar bagagem depois
  let bagLoss: number | null = null;
  let bagDetail: string;
  if (fare.baggageIncluded === true) {
    bagLoss = 0;
    bagDetail = "Bagagem despachada já incluída na tarifa.";
  } else if (rules.baggageAirportFee !== null && rules.baggageOnlineFee !== null) {
    bagLoss = Math.max(0, rules.baggageAirportFee - rules.baggageOnlineFee) * legs * n;
    bagDetail = "Diferença entre comprar a bagagem no aeroporto e comprar antes, por trecho e passageiro.";
  } else if (rules.baggageAirportFee !== null) {
    bagLoss = rules.baggageAirportFee * legs * n;
    bagDetail = "Valor cheio no aeroporto (o preço antecipado não foi informado, então a economia de comprar antes não é calculável).";
  } else {
    bagDetail = "Preço da bagagem não informado pela fonte — confirmar com a companhia.";
  }
  scenarios.push({ key: "bagagem_depois", label: "Adicionar bagagem depois", loss: bagLoss, detail: bagDetail });

  const flexLosses = [cancelLoss, changeLoss].filter((x): x is number => x !== null);
  const worstKnownLoss = flexLosses.length ? Math.max(...flexLosses) : null;
  const complete = cancelLoss !== null && changeLoss !== null && bagLoss !== null;
  const expectedCost = complete
    ? price + opts.pChange * Math.max(cancelLoss as number, changeLoss as number) + (opts.needsBaggageLater ? (bagLoss as number) : 0)
    : null;

  // Condições restritivas: as informadas pela fonte + as derivadas dos dados
  const restrictions = [...rules.restrictions];
  if (rules.refundable === "nao") restrictions.push("Tarifa não reembolsável.");
  if (rules.changeAllowed === "nao") restrictions.push("Não permite alteração.");
  if (rules.creditValidityMonths !== null) {
    restrictions.push(`Crédito de viagem com validade de ${rules.creditValidityMonths} meses.`);
  }
  if (fare.baggageIncluded !== true) restrictions.push("Bagagem despachada não confirmada como incluída.");
  if (rules.noShowRule && !/não informado/i.test(rules.noShowRule)) restrictions.push(`No-show: ${rules.noShowRule}`);

  return { fare, rules, scenarios, worstKnownLoss, complete, expectedCost, restrictions: Array.from(new Set(restrictions)) };
}

export interface RiskRanking {
  best: RiskAnalysis | null;
  cheapest: RiskAnalysis | null;
  ordered: RiskAnalysis[]; // completas por custo esperado; incompletas ao final
}

export function rankRisk(list: RiskAnalysis[]): RiskRanking {
  const complete = list.filter((a) => a.complete).sort((a, b) => (a.expectedCost as number) - (b.expectedCost as number));
  const incomplete = list.filter((a) => !a.complete);
  const cheapest = [...list].sort((a, b) => a.fare.price - b.fare.price)[0] ?? null;
  return { best: complete[0] ?? null, cheapest, ordered: [...complete, ...incomplete] };
}
