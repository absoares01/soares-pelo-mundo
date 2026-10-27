import { NextResponse } from "next/server";
import { emailConfigured, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!emailConfigured()) {
    return NextResponse.json({ error: "E-mail não configurado: falta RESEND_API_KEY na Vercel (veja o README)." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { to?: unknown };
  const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  try {
    await sendEmail({
      to,
      subject: "✈️ Teste de alerta — Soares pelo Mundo",
      text: "Se você recebeu esta mensagem, o envio de alertas de preço está funcionando.",
      html: "<p>Se você recebeu esta mensagem, o envio de <strong>alertas de preço</strong> está funcionando. ✈️</p>",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao enviar." }, { status: 502 });
  }
}
