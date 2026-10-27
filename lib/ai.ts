// Camada de IA com busca na web (API da Anthropic, ferramenta "web_search").
// Usada nos módulos 4, 5 e 6, onde a informação (cupons, taxas, regras de tarifa)
// não vem de uma API de voos. Regras de segurança aplicadas em outro lugar
// (lib/research.ts): toda informação precisa de uma fonte cujo link foi de fato
// retornado pela busca; o que não tiver fonte é descartado.

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface WebResearch {
  text: string; // texto final do modelo (esperado: um bloco JSON)
  urls: Set<string>; // URLs que a busca realmente retornou ou citou
  titles: Map<string, string>; // url -> título
  searches: number;
}

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  content?: unknown;
  citations?: { url?: string; title?: string }[];
}

interface ApiResponse {
  content?: ContentBlock[];
  stop_reason?: string;
  error?: { message?: string };
}

export function normalizeUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    let s = x.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return u;
  }
}

export async function researchWeb(opts: {
  system: string;
  user: string;
  maxSearches?: number;
  maxTokens?: number;
}): Promise<WebResearch> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("IA não configurada (ANTHROPIC_API_KEY).");

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: opts.user }];

  const urls = new Set<string>();
  const titles = new Map<string, string>();
  let searches = 0;
  let text = "";

  // Buscas na web rodam no servidor da Anthropic; turnos longos podem ser pausados
  // ("pause_turn") e precisam ser continuados reenviando o conteúdo recebido.
  for (let turn = 0; turn < 4; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 4000,
        system: opts.system,
        messages,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: opts.maxSearches ?? 6,
            user_location: { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" },
          },
        ],
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    if (!res.ok) {
      const msg = data.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`Falha na pesquisa com IA: ${msg}`);
    }

    const blocks = data.content ?? [];
    for (const b of blocks) {
      if (b.type === "server_tool_use" && b.name === "web_search") searches++;
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content as { type?: string; url?: string; title?: string }[]) {
          if (r.type === "web_search_result" && r.url) {
            const n = normalizeUrl(r.url);
            urls.add(n);
            if (r.title) titles.set(n, r.title);
          }
        }
      }
      if (b.type === "text") {
        for (const c of b.citations ?? []) {
          if (c.url) {
            const n = normalizeUrl(c.url);
            urls.add(n);
            if (c.title) titles.set(n, c.title);
          }
        }
      }
    }

    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: blocks });
      continue;
    }
    text = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();
    break;
  }

  if (!text) throw new Error("A IA não devolveu um resultado. Tente novamente.");
  return { text, urls, titles, searches };
}

// Extrai o primeiro objeto JSON do texto (bloco ```json ou chaves mais externas).
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("A resposta da IA não veio no formato esperado.");
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new Error("A resposta da IA não veio no formato esperado.");
  }
}
