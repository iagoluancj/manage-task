-- Criação das tabelas para a usuária Leticia
-- Execute este SQL no Supabase SQL Editor

-- Tabela de tarefas da Leticia (json_data)
CREATE TABLE IF NOT EXISTS leticia_json_data (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT NOT NULL,
    data JSONB
);

-- Inserir registro padrão se não existir
INSERT INTO leticia_json_data (id, name, data)
VALUES (1, 'Planejamento', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Tabela de notas rápidas da Leticia
CREATE TABLE IF NOT EXISTS leticia_quick_notes (
    id INTEGER PRIMARY KEY DEFAULT 1,
    notes TEXT
);

-- Inserir registro padrão se não existir
INSERT INTO leticia_quick_notes (id, notes)
VALUES (1, 'Minhas notas...')
ON CONFLICT (id) DO NOTHING;

-- Tabela de transações da Leticia
CREATE TABLE IF NOT EXISTS leticia_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'invoice_payment')),
    payment_method TEXT NOT NULL DEFAULT 'credit' CHECK (payment_method IN ('credit', 'debit')),
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_leticia_transactions_description ON leticia_transactions (description);
CREATE INDEX IF NOT EXISTS idx_leticia_transactions_created_at ON leticia_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leticia_transactions_type ON leticia_transactions (type);

-- Comentários
COMMENT ON TABLE leticia_json_data IS 'Tabela de tarefas da usuária Leticia';
COMMENT ON TABLE leticia_quick_notes IS 'Tabela de notas rápidas da usuária Leticia';
COMMENT ON TABLE leticia_transactions IS 'Tabela de transações financeiras da usuária Leticia';
