var Stripe = require("stripe");
var { getSupabaseAdmin } = require("./lib/supabase");
var { createGelatoOrder } = require("./lib/gelato");

function readRawBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  var stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  var rawBody = await readRawBody(req);
  var event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Assinatura do webhook inválida:", err.message);
    res.status(400).send("Webhook Error: " + err.message);
    return;
  }

  if (event.type !== "checkout.session.completed") {
    res.status(200).json({ received: true });
    return;
  }

  var session = event.data.object;
  var orderId = session.metadata && session.metadata.order_id;
  if (!orderId) {
    console.error("checkout.session.completed sem order_id nos metadata.");
    res.status(200).json({ received: true });
    return;
  }

  var supabase = getSupabaseAdmin();

  try {
    var fetchResult = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (fetchResult.error) throw fetchResult.error;
    var order = fetchResult.data;

    if (order.status !== "pending_payment") {
      // Evento repetido (Stripe reenvia webhooks) — já processado, não duplicar a encomenda na Gelato.
      res.status(200).json({ received: true });
      return;
    }

    await supabase.from("orders").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", orderId);

    var addr = order.shipping_address;
    var gelatoOrder = await createGelatoOrder({
      orderId: order.id,
      currency: order.currency,
      quantity: order.quantity,
      imageUrl: order.image_url,
      shipping: addr
    });

    await supabase
      .from("orders")
      .update({ status: "sent_to_print", gelato_order_id: gelatoOrder.id, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  } catch (err) {
    console.error("Falha ao processar encomenda paga (order_id=" + orderId + "):", err);
    await supabase
      .from("orders")
      .update({ status: "failed", error_message: String(err.message || err), updated_at: new Date().toISOString() })
      .eq("id", orderId);
    // Responde 200 na mesma: o pagamento já foi cobrado, uma falha aqui precisa de
    // reconciliação manual (ver coluna error_message na tabela orders), não de retry automático
    // do Stripe reenviando o mesmo evento indefinidamente.
  }

  res.status(200).json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
