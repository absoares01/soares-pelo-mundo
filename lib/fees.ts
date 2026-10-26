import type { Flight } from "./types";

// Taxas ESTIMADAS informadas pelo consultor no formulário. O app não inventa
// valores de taxas: se o campo ficar vazio (0), nenhuma taxa é somada e a tela
// avisa que a regra de bagagem deve ser confirmada com a companhia.

export interface FeeAssumptions {
  checkedBagFee: number; // por trecho (ida ou volta), por passageiro
  seatFee: number; // por trecho, por passageiro
  needsCheckedBag: boolean;
  needsSeat: boolean;
}

export const NO_FEES: FeeAssumptions = {
  checkedBagFee: 0,
  seatFee: 0,
  needsCheckedBag: false,
  needsSeat: false,
};

export function estimateFees(
  flight: Flight,
  fees: FeeAssumptions,
  opts: { adults: number; roundTrip: boolean },
): { label: string; amount: number }[] {
  const legs = opts.roundTrip ? 2 : 1;
  const out: { label: string; amount: number }[] = [];

  if (fees.needsCheckedBag && flight.baggage.status !== "incluida" && fees.checkedBagFee > 0) {
    out.push({
      label: `Bagagem despachada (estimada, ${legs} trecho${legs > 1 ? "s" : ""})`,
      amount: fees.checkedBagFee * legs * opts.adults,
    });
  }
  if (fees.needsSeat && fees.seatFee > 0) {
    out.push({
      label: `Marcação de assento (estimada, ${legs} trecho${legs > 1 ? "s" : ""})`,
      amount: fees.seatFee * legs * opts.adults,
    });
  }
  return out;
}

export function totalWithFees(
  flight: Flight,
  fees: FeeAssumptions,
  opts: { adults: number; roundTrip: boolean },
): { finalPrice: number; items: { label: string; amount: number }[] } {
  const items = estimateFees(flight, fees, opts);
  const extra = items.reduce((s, i) => s + i.amount, 0);
  return { finalPrice: (flight.price ?? 0) + extra, items };
}

export function parseFees(input: Partial<Record<keyof FeeAssumptions, unknown>> | undefined): FeeAssumptions {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0;
  };
  return {
    checkedBagFee: num(input?.checkedBagFee),
    seatFee: num(input?.seatFee),
    needsCheckedBag: Boolean(input?.needsCheckedBag),
    needsSeat: Boolean(input?.needsSeat),
  };
}
