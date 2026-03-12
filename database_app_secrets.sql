-- Tabela de secrets (chaves de API etc.). Use a service_role para ler.
-- Execute no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir a chave da Groq (substitua 'SUA_CHAVE_GROQ_AQUI' pela chave real):
INSERT INTO app_secrets (key, value)
VALUES ('GROQ_API_KEY', 'SUA_CHAVE_GROQ_AQUI')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Opcional: restringir leitura apenas ao backend (RLS)
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role pode ler app_secrets"
  ON app_secrets FOR SELECT
  TO service_role
  USING (true);

COMMENT ON TABLE app_secrets IS 'Chaves e secrets da aplicação (ex: GROQ_API_KEY). Ler apenas com service_role.';
