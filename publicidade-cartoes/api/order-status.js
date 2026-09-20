var { getSupabaseAdmin } = require("./lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  var sessionId = req.query.session_id;
  if (!sessionId) {
    res.status(400).json({ error: "session_id em falta." });
    return;
  }

  try {
    var supabase = getSupabaseAdmin();
    var result = await supabase
      .from("orders")
      .select("status, quantity, template_id, amount_cents, currency, created_at")
      .eq("stripe_session_id", sessionId)
      .single();

    if (result.error || !result.data) {
      res.status(404).json({ error: "Encomenda não encontrada." });
      return;
    }

    res.status(200).json(result.data);
  } catch (err) {
    console.error("order-status error:", err);
    res.status(500).json({ error: "Não foi possível consultar a encomenda." });
  }
};
