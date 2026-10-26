import { searchRoute } from "@/lib/api";
import { runAlternativesSearch } from "@/lib/search";
import { parseAlternatives } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = searchRoute({
  module: "ocultos",
  parse: parseAlternatives,
  run: runAlternativesSearch,
  title: (i) => `Voos pouco vistos ${i.origin.join("/")}→${i.destination.join("/")} (${i.outDate})`,
});
