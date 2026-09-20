// Fonte de verdade do preço: nunca confiar num valor vindo do cliente.
// PRICE_TABLE vem de uma env var tipo "100:2999,250:4999,500:7999" (quantidade:cêntimos).

function getPriceTable() {
  var raw = process.env.PRICE_TABLE || "100:2999,250:4999,500:7999";
  var table = {};
  raw.split(",").forEach(function (pair) {
    var parts = pair.trim().split(":");
    var qty = parseInt(parts[0], 10);
    var cents = parseInt(parts[1], 10);
    if (qty > 0 && cents > 0) table[qty] = cents;
  });
  return table;
}

function getAllowedQuantities() {
  return Object.keys(getPriceTable()).map(Number).sort(function (a, b) { return a - b; });
}

// Retorna o preço em cêntimos para uma quantidade, ou null se a quantidade não for um
// escalão válido (o pedido deve ser recusado nesse caso).
function priceForQuantity(qty) {
  var table = getPriceTable();
  return Object.prototype.hasOwnProperty.call(table, qty) ? table[qty] : null;
}

module.exports = { getPriceTable, getAllowedQuantities, priceForQuantity };
