-- Notificações de afiliado
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS notificacoes_afiliado (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  afiliado_id UUID        NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL DEFAULT 'nova_venda', -- nova_venda | pagamento | aviso
  mensagem    TEXT        NOT NULL,
  enviada     BOOLEAN     NOT NULL DEFAULT FALSE,
  lida        BOOLEAN     NOT NULL DEFAULT FALSE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_afiliado ON notificacoes_afiliado(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_notif_enviada  ON notificacoes_afiliado(enviada) WHERE NOT enviada;

-- RLS
ALTER TABLE notificacoes_afiliado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif afiliado tenant" ON notificacoes_afiliado;
CREATE POLICY "notif afiliado tenant" ON notificacoes_afiliado
  FOR ALL USING (
    afiliado_id IN (
      SELECT id FROM afiliados
      WHERE tenant_id = (SELECT tenant_id FROM perfis WHERE id = auth.uid())
    )
  );

-- Trigger: inserir notificação a cada nova venda registrada
CREATE OR REPLACE FUNCTION fn_notificar_nova_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notificacoes_afiliado (afiliado_id, tipo, mensagem)
  VALUES (
    NEW.afiliado_id,
    'nova_venda',
    format(
      'Nova venda registrada! Pedido %s — Comissão: R$ %s',
      COALESCE(NEW.pedido_ref, left(NEW.pedido_id::text, 8)),
      to_char(NEW.comissao_valor, 'FM999G999D99')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_nova_venda ON afiliado_vendas;
CREATE TRIGGER trg_notificar_nova_venda
  AFTER INSERT ON afiliado_vendas
  FOR EACH ROW
  EXECUTE FUNCTION fn_notificar_nova_venda();

-- Verificação
SELECT 'notificacoes_afiliado criada com trigger' AS status;
