import { searchRoute } from "@/lib/api";
import { runHiddenCitySearch } from "@/lib/search";
import { parseHidden } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = searchRoute({
  module: "hidden-city",
  parse: parseHidden,
  run: runHiddenCitySearch,
  title: (i) => `Hidden-city ${i.origin.join("/")}→${i.destination.join("/")} (${i.outDate})`,
});
