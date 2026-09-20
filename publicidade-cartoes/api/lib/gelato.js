// Integração com a Gelato Order API (impressão + envio dos cartões físicos).
// Docs: https://developers.gelato.com/  — confirma sempre o productUid exato via
// GET https://product.gelatoapis.com/v3/products:search antes de ir a produção
// (ver comentário em GELATO_PRODUCT_UID no .env.example).

var ORDER_API_BASE = "https://order.gelatoapis.com/v4";

async function createGelatoOrder(opts) {
  var apiKey = process.env.GELATO_API_KEY;
  var productUid = process.env.GELATO_PRODUCT_UID;
  if (!apiKey || !productUid) {
    throw new Error("GELATO_API_KEY / GELATO_PRODUCT_UID em falta nas variáveis de ambiente.");
  }

  var body = {
    orderType: "order",
    orderReferenceId: opts.orderId,
    customerReferenceId: opts.orderId,
    currency: opts.currency.toUpperCase(),
    items: [
      {
        itemReferenceId: opts.orderId + "-card",
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
