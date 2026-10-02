var { createClient } = require("@supabase/supabase-js");

var client = null;

// Cliente com a service role key — só é usado no servidor (funções /api), nunca no browser.
function getSupabaseAdmin() {
  if (!client) {
    var url = process.env.SUPABASE_URL;
    var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta nas variáveis de ambiente.");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Faz upload de uma imagem (Buffer) para o bucket "print-files" e devolve a URL pública.
async function uploadPrintFile(orderId, buffer, contentType) {
  var supabase = getSupabaseAdmin();
  var path = orderId + ".png";
  var upload = await supabase.storage.from("print-files").upload(path, buffer, {
    contentType: contentType || "image/png",
    upsert: true
  });
  if (upload.error) throw upload.error;
  var pub = supabase.storage.from("print-files").getPublicUrl(path);
  return pub.data.publicUrl;
}

module.exports = { getSupabaseAdmin, uploadPrintFile };
