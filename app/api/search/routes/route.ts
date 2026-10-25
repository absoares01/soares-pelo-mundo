import { searchRoute } from "@/lib/api";
import { runRoutesSearch } from "@/lib/search";
import { parseRoutes } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = searchRoute({
  module: "escalas",
  parse: parseRoutes,
  run: runRoutesSearch,
  title: (i) => `Rota com escalas ${i.origin.join("/")}→${i.destination.join("/")} (${i.outDate})`,
});
