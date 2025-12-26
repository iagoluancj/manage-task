-- Script de migração para adicionar suporte a invoice_payment
-- Execute este SQL no Supabase SQL Editor se a tabela já existir

-- Remove o constraint antigo se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_type_check'
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
    END IF;
END $$;

-- Adiciona o novo constraint com invoice_payment
ALTER TABLE transactions 
    ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('income', 'expense', 'invoice_payment'));

-- Atualiza comentário
COMMENT ON COLUMN transactions.type IS 'Tipo: "income" para entradas, "expense" para saídas, "invoice_payment" para faturas pagas';

