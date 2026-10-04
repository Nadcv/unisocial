-- UniAds Studio — esquema de encomendas de cartões e convites impressos/digitais
-- Corre isto uma vez no SQL Editor do teu projeto Supabase.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 'delivered': pedido 100% digital (convite-digital), entregue por download/e-mail,
  -- sem passar pela Gelato nem precisar de morada de envio.
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'sent_to_print', 'delivered', 'failed', 'canceled')),

  -- dados do design (para reimpressão/consulta, não é a fonte de verdade do preço)
  template_id text not null,
  product_format text not null default 'card'
    check (product_format in ('card', 'convite', 'convite-digital', 'aniversario', 'aniversario-digital')),
  quantity integer not null,
  fields jsonb not null default '{}'::jsonb,

  -- ficheiro pronto para impressão/download (guardado no Supabase Storage, bucket "print-files")
  image_url text,

  -- morada de envio (nula para "convite-digital", que não é enviado por correio)
  shipping_name text,
  shipping_address jsonb,
  contact_email text not null,

  -- preço cobrado (fonte de verdade: calculado no servidor, nunca confiar no cliente)
  amount_cents integer not null,
  currency text not null default 'eur',

  -- referências externas
  stripe_session_id text unique,
  gelato_order_id text,

  error_message text
);

create index if not exists orders_stripe_session_id_idx on orders (stripe_session_id);
create index if not exists orders_status_idx on orders (status);

-- Bucket de storage para os ficheiros de impressão/download (cria também pelo dashboard do
-- Supabase em Storage > New bucket > "print-files", público para leitura — a Gelato precisa
-- de descarregar o ficheiro pela URL, e o cliente de "convite-digital" descarrega o mesmo
-- ficheiro diretamente).

-- Migração para quem já tinha a tabela orders antes dos convites/cartões de aniversário
-- (impressos e digitais) existirem — corre sempre a versão mais recente destes blocos:
-- alter table orders add column if not exists product_format text not null default 'card';
-- alter table orders drop constraint if exists orders_product_format_check;
-- alter table orders add constraint orders_product_format_check
--   check (product_format in ('card', 'convite', 'convite-digital', 'aniversario', 'aniversario-digital'));
-- alter table orders drop constraint if exists orders_status_check;
-- alter table orders add constraint orders_status_check
--   check (status in ('pending_payment', 'paid', 'sent_to_print', 'delivered', 'failed', 'canceled'));
-- alter table orders alter column shipping_name drop not null;
-- alter table orders alter column shipping_address drop not null;
