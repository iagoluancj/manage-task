-- Criação da tabela de transações financeiras
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    payment_method TEXT NOT NULL DEFAULT 'credit' CHECK (payment_method IN ('credit', 'debit')),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar performance nas buscas por descrição (autocomplete)
-- Usa índice B-tree simples que funciona bem com LIKE e ILIKE
CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions (description);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE transactions IS 'Tabela para armazenar transações financeiras (entradas e saídas)';
COMMENT ON COLUMN transactions.description IS 'Descrição da transação (ex: "uber", "Salario")';
COMMENT ON COLUMN transactions.amount IS 'Valor da transação (sempre positivo)';
COMMENT ON COLUMN transactions.type IS 'Tipo: "income" para entradas, "expense" para saídas';
COMMENT ON COLUMN transactions.category IS 'Categoria da transação (para uso futuro, ex: "transporte", "alimentação")';
COMMENT ON COLUMN transactions.created_at IS 'Data e hora de criação da transação';


