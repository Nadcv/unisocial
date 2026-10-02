// Integração com a Gelato Order API (impressão + envio dos cartões físicos).
// Docs: https://developers.gelato.com/  — confirma sempre o productUid exato via
// GET https://product.gelatoapis.com/v3/products:search antes de ir a produção
// (ver comentário em GELATO_PRODUCT_UID no .env.example).

var ORDER_API_BASE = "https://order.gelatoapis.com/v4";

// UID do produto Gelato por formato. GELATO_PRODUCT_UID (sem sufixo) continua a
// funcionar como o UID do cartão de visita, por compatibilidade.
var UID_ENV_BY_FORMAT = {
  convite: "GELATO_PRODUCT_UID_CONVITE"
};

function productUidForFormat(format) {
  var envKey = UID_ENV_BY_FORMAT[format];
  if (envKey && process.env[envKey]) return process.env[envKey];
  return process.env.GELATO_PRODUCT_UID;
}

async function createGelatoOrder(opts) {
  var apiKey = process.env.GELATO_API_KEY;
  var productUid = productUidForFormat(opts.format);
  if (!apiKey || !productUid) {
    throw new Error(
      "GELATO_API_KEY / UID do produto (" +
        (UID_ENV_BY_FORMAT[opts.format] || "GELATO_PRODUCT_UID") +
        ") em falta nas variáveis de ambiente."
    );
  }

  var body = {
    orderType: "order",
    orderReferenceId: opts.orderId,
    customerReferenceId: opts.orderId,
    currency: opts.currency.toUpperCase(),
    items: [
      {
        itemReferenceId: opts.orderId + "-" + (opts.format || "card"),
        productUid: productUid,
        files: [{ type: "default", url: opts.imageUrl }],
        quantity: opts.quantity
      }
    ],
    shipmentMethodUid: "normal",
    shippingAddress: {
      firstName: opts.shipping.firstName,
      lastName: opts.shipping.lastName,
      addressLine1: opts.shipping.addressLine1,
      addressLine2: opts.shipping.addressLine2 || "",
      city: opts.shipping.city,
      postCode: opts.shipping.postCode,
      country: opts.shipping.country, // código ISO-2, ex: "PT"
      email: opts.shipping.email,
      phone: opts.shipping.phone || ""
    }
  };

  var res = await fetch(ORDER_API_BASE + "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify(body)
  });

  var data = await res.json().catch(function () { return null; });
  if (!res.ok) {
    var msg = (data && (data.message || JSON.stringify(data))) || ("Gelato respondeu " + res.status);
    throw new Error("Falha ao criar encomenda na Gelato: " + msg);
  }
  return data; // inclui data.id (o gelato_order_id a guardar)
}

module.exports = { createGelatoOrder };
