// Envio de e-mail via API da Resend (https://resend.com). Best-effort: se
// RESEND_API_KEY não estiver configurada, simplesmente não envia (não rebenta o fluxo
// de pagamento por causa disto) — a entrega digital continua a funcionar por download
// em pedido-confirmado.html mesmo sem isto configurado.

async function sendEmail(to, subject, html) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  var from = process.env.EMAIL_FROM || "UniAds Studio <onboarding@resend.dev>";
  var res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ from: from, to: [to], subject: subject, html: html })
  });

  if (!res.ok) {
    var text = await res.text().catch(function () { return ""; });
    console.error("Falha ao enviar e-mail (" + res.status + "):", text);
  }
}

function digitalInviteEmailHtml(downloadUrl, label) {
  label = label || "ficheiro";
  return (
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#111;">' +
    '<h2 style="margin:0 0 12px;">O teu ' + label + " digital está pronto!</h2>" +
    "<p>Obrigado pela compra. Podes descarregar o teu " + label + " personalizado no link abaixo.</p>" +
    '<p style="text-align:center;margin:24px 0;">' +
    '<a href="' + downloadUrl + '" style="display:inline-block;background:#4e8cff;color:#fff;text-decoration:none;' +
    'padding:12px 28px;border-radius:8px;font-weight:600;">Descarregar convite</a></p>' +
    '<p style="color:#666;font-size:13px;">Se o botão não funcionar, copia este link para o navegador: ' + downloadUrl + "</p>" +
    "</div>"
  );
}

module.exports = { sendEmail, digitalInviteEmailHtml };
