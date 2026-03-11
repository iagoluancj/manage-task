-- Corrige as datas que foram inseridas em 2025 para 2026
-- Executa no Supabase SQL Editor na tabela transactions

-- Atualiza created_at: soma 1 ano para registros entre 27/02/2025 e 09/03/2025
UPDATE transactions
SET created_at = created_at + INTERVAL '1 year'
WHERE created_at >= '2025-02-27 00:00:00+00'
  AND created_at <= '2025-03-10 00:00:00+00';

-- Confere quantos registros foram alterados (opcional: rode depois do UPDATE)
-- SELECT COUNT(*), MIN(created_at), MAX(created_at)
-- FROM transactions
-- WHERE created_at >= '2026-02-27' AND created_at <= '2026-03-10';
