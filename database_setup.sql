-- Criação da tabela de transações financeiras
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar performance nas buscas por descrição (autocomplete)
CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions USING gin (description gin_trgm_ops);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

-- Habilitar extensão para busca de texto (necessário para o índice gin_trgm_ops)
-- Execute apenas se ainda não estiver habilitada
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Comentários para documentação
COMMENT ON TABLE transactions IS 'Tabela para armazenar transações financeiras (entradas e saídas)';
COMMENT ON COLUMN transactions.description IS 'Descrição da transação (ex: "uber", "Salario")';
COMMENT ON COLUMN transactions.amount IS 'Valor da transação (sempre positivo)';
COMMENT ON COLUMN transactions.type IS 'Tipo: "income" para entradas, "expense" para saídas';
COMMENT ON COLUMN transactions.category IS 'Categoria da transação (para uso futuro, ex: "transporte", "alimentação")';
COMMENT ON COLUMN transactions.created_at IS 'Data e hora de criação da transação';

