// Fonte de verdade do preço: nunca confiar num valor vindo do cliente.
// PRICE_TABLE vem de uma env var tipo "card:100:2999,convite:5:1499,convite-digital:1:990"
// (formato:quantidade:cêntimos) — um escalão por produto/quantidade.

var DEFAULT_TABLE =
  "card:100:2999,card:250:4999,card:500:7999," +
  "convite:5:1499,convite:10:1999,convite:20:2999,convite:50:4999,convite:100:7999," +
  "convite-digital:1:990";

function getPriceTable() {
  var raw = process.env.PRICE_TABLE || DEFAULT_TABLE;
  var table = {};
  raw.split(",").forEach(function (entry) {
    var parts = entry.trim().split(":");
    if (parts.length !== 3) return;
    var format = parts[0];
    var qty = parseInt(parts[1], 10);
    var cents = parseInt(parts[2], 10);
    if (!format || !(qty > 0) || !(cents > 0)) return;
    if (!table[format]) table[format] = {};
    table[format][qty] = cents;
  });
  return table;
}

function getAllowedQuantities(format) {
  var table = getPriceTable();
  var tiers = table[format] || {};
  return Object.keys(tiers).map(Number).sort(function (a, b) { return a - b; });
}

// Retorna o preço em cêntimos para um formato+quantidade, ou null se não for um
// escalão válido (o pedido deve ser recusado nesse caso).
function priceForQuantity(format, qty) {
  var table = getPriceTable();
  var tiers = table[format];
  if (!tiers || !Object.prototype.hasOwnProperty.call(tiers, qty)) return null;
  return tiers[qty];
}

module.exports = { getPriceTable, getAllowedQuantities, priceForQuantity };
