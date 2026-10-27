// Envio de e-mail pelo Resend (API REST). Variáveis:
//   RESEND_API_KEY   chave da API
//   ALERT_FROM_EMAIL remetente (padrão: onboarding@resend.dev, que só entrega ao e-mail da própria conta Resend)

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function sendEmail(args: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("E-mail não configurado (RESEND_API_KEY).");
  const from = process.env.ALERT_FROM_EMAIL || "Soares pelo Mundo <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "user-agent": "soares-pelo-mundo/1.0",
    },
    body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html, text: args.text }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      /* sem corpo JSON */
    }
    throw new Error(`Falha ao enviar e-mail: ${msg}`);
  }
}
