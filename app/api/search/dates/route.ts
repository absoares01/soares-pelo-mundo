import { searchRoute } from "@/lib/api";
import { runDatesSearch } from "@/lib/search";
import { parseDates } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = searchRoute({
  module: "datas",
  parse: parseDates,
  run: runDatesSearch,
  title: (i) => `Datas mais baratas ${i.origin.join("/")}→${i.destination.join("/")} (${i.outDate})`,
});
