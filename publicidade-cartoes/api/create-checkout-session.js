var Stripe = require("stripe");
var { getSupabaseAdmin, uploadPrintFile } = require("./lib/supabase");
var { priceForQuantity, getAllowedQuantities } = require("./lib/price");

var REQUIRED_SHIPPING_FIELDS = ["firstName", "lastName", "addressLine1", "city", "postCode", "country", "email"];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    var body = req.body || {};
    var templateId = String(body.templateId || "").slice(0, 60);
    var quantity = parseInt(body.quantity, 10);
    var fields = body.fields && typeof body.fields === "object" ? body.fields : {};
    var shipping = body.shipping && typeof body.shipping === "object" ? body.shipping : {};
    var imageBase64 = body.imageBase64;

    if (!templateId) {
      res.status(400).json({ error: "templateId em falta." });
      return;
    }

    var amountCents = priceForQuantity(quantity);
    if (amountCents === null) {
      res.status(400).json({ error: "Quantidade inválida. Opções: " + getAllowedQuantities().join(", ") + "." });
      return;
    }

    for (var i = 0; i < REQUIRED_SHIPPING_FIELDS.length; i++) {
      var key = REQUIRED_SHIPPING_FIELDS[i];
      if (!shipping[key] || !String(shipping[key]).trim()) {
        res.status(400).json({ error: "Morada de envio incompleta (campo em falta: " + key + ")." });
        return;
      }
    }

    if (!imageBase64 || typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/")) {
      res.status(400).json({ error: "Imagem do cartão em falta ou inválida." });
      return;
    }

    var currency = (process.env.CURRENCY || "eur").toLowerCase();
    var supabase = getSupabaseAdmin();

    // 1. Cria a linha da encomenda primeiro para termos um id.
    var insertResult = await supabase
      .from("orders")
      .insert({
        status: "pending_payment",
        template_id: templateId,
        quantity: quantity,
        fields: fields,
        shipping_name: shipping.firstName + " " + shipping.lastName,
        shipping_address: shipping,
        contact_email: shipping.email,
        amount_cents: amountCents,
        currency: currency
      })
      .select()
      .single();

    if (insertResult.error) throw insertResult.error;
    var order = insertResult.data;

    // 2. Sobe o PNG de impressão para o Storage e guarda a URL pública na encomenda.
    var base64Data = imageBase64.split(",")[1];
    var buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: "Imagem demasiado grande (máx. 8MB)." });
      return;
    }
    var imageUrl = await uploadPrintFile(order.id, buffer, "image/png");
    await supabase.from("orders").update({ image_url: imageUrl }).eq("id", order.id);

    // 3. Cria a sessão de pagamento Stripe.
    var stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    var siteUrl = process.env.PUBLIC_SITE_URL || ("https://" + req.headers.host);
    var session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency,
            unit_amount: amountCents,
            product_data: {
              name: "Cartões de visita impressos (" + quantity + " un.) — " + templateId,
              description: (fields.empresa || fields.nome || "UniAds Studio")
            }
          }
        }
      ],
      customer_email: shipping.email,
      metadata: { order_id: order.id },
      success_url: siteUrl + "/pedido-confirmado.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: siteUrl + "/index.html#editor"
    });

    await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    res.status(500).json({ error: "Não foi possível iniciar o pagamento. Tenta novamente." });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: "10mb" } } };
