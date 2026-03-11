-- Inserção em lote: gastos de 27/02 a 09/03
-- Tabela: transactions (usuário iago)
-- Ano: 2026.
-- Valores parcelados (x3 etc.) = valor de UMA parcela. Ex: "remedio 93,23 x3" = 279,69 em "Remédios pai x3".
-- Padronização de nomes conforme descrições já existentes no sistema.

-- ========== CRÉDITO (type = expense, payment_method = credit) ==========

-- 27/02
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Uber', 8.20, 'expense', 'credit', '2026-02-27 12:00:00+00'),
('Combo Ifood', 19.97, 'expense', 'credit', '2026-02-27 12:00:00+00');

-- 28/02
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Hostinger', 12.00, 'expense', 'credit', '2026-02-28 12:00:00+00'),
('Letícia', 10.81, 'expense', 'credit', '2026-02-28 12:00:00+00'),
('Ração', 8.50, 'expense', 'credit', '2026-02-28 12:00:00+00'),
('Cigarro', 8.00, 'expense', 'credit', '2026-02-28 12:00:00+00');

-- 03/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Cigarro', 9.00, 'expense', 'credit', '2026-03-03 12:00:00+00'),
('Desconhecido', 16.00, 'expense', 'credit', '2026-03-03 12:00:00+00'),
('Cartão Todos Pai', 33.40, 'expense', 'credit', '2026-03-03 12:00:00+00'),
('Plano Nu Cell', 10.00, 'expense', 'credit', '2026-03-03 12:00:00+00'),
('Google fotos', 9.99, 'expense', 'credit', '2026-03-03 12:00:00+00'),
('Amazon prime', 19.90, 'expense', 'credit', '2026-03-03 12:00:00+00');

-- 04/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Letícia', 5.35, 'expense', 'credit', '2026-03-04 12:00:00+00');

-- 05/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Limpeza mão pai', 52.69, 'expense', 'credit', '2026-03-05 12:00:00+00'),
('Remédios pai x3', 279.69, 'expense', 'credit', '2026-03-05 12:00:00+00');

-- 05/03 - Pagamento fatura (não entra em saída, entra em Faturas Pagas)
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Pagamento Fatura Cartão Crédito', 1984.35, 'invoice_payment', 'credit', '2026-03-05 12:00:00+00');

-- 06/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Papelaria', 4.50, 'expense', 'credit', '2026-03-06 12:00:00+00'),
('Sympla show terno rei x3', 101.51, 'expense', 'credit', '2026-03-06 12:00:00+00'),
('Pastel', 4.00, 'expense', 'credit', '2026-03-06 12:00:00+00'),
('Pimentinha', 4.99, 'expense', 'credit', '2026-03-06 12:00:00+00');

-- 08/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Pizza', 38.48, 'expense', 'credit', '2026-03-08 12:00:00+00');

-- 09/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Superluna', 49.30, 'expense', 'credit', '2026-03-09 12:00:00+00');


-- ========== DÉBITO (type = expense ou income, payment_method = debit) ==========

-- 27/02
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Taz burguer', 46.00, 'expense', 'debit', '2026-02-27 12:00:00+00'),
('Desconhecido', 24.90, 'expense', 'debit', '2026-02-27 12:00:00+00'),
('Letícia', 10.00, 'expense', 'debit', '2026-02-27 12:00:00+00'),
('Vale: Padaria', 35.69, 'expense', 'debit', '2026-02-27 12:00:00+00');

-- 28/02
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Vale: Supermercado', 459.00, 'expense', 'debit', '2026-02-28 12:00:00+00');

-- 01/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Uber até Letícia', 21.87, 'expense', 'debit', '2026-03-01 12:00:00+00'),
('Uber volta casa', 19.47, 'expense', 'debit', '2026-03-01 12:00:00+00');

-- 02/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Vale: Padaria', 21.38, 'expense', 'debit', '2026-03-02 12:00:00+00');

-- 03/03 (entrada = income, débito)
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Freela Plataforma MR Cursos', 2800.00, 'income', 'debit', '2026-03-03 12:00:00+00'),
('Loteria', 106.50, 'expense', 'debit', '2026-03-03 12:00:00+00'),
('Uber', 26.20, 'expense', 'debit', '2026-03-03 12:00:00+00'),
('Uber', 8.50, 'expense', 'debit', '2026-03-03 12:00:00+00'),
('Uber', 7.55, 'expense', 'debit', '2026-03-03 12:00:00+00'),
('Uber', 22.45, 'expense', 'debit', '2026-03-03 12:00:00+00'),
('Lanchonete', 15.50, 'expense', 'debit', '2026-03-03 12:00:00+00');

-- 04/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Cigarro', 8.50, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Uber volta Letícia e eu', 54.75, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Uber volta casa', 28.53, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Lanche', 13.00, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Almoço', 27.00, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Sorvete', 11.00, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Bis', 6.49, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Empada', 7.99, 'expense', 'debit', '2026-03-04 12:00:00+00'),
('Pastel', 10.00, 'expense', 'debit', '2026-03-04 12:00:00+00');

-- 05/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Internet', 99.90, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Tamires', 10.00, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Mirian', 15.00, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Faculdade', 146.54, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Hamburguer', 40.00, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Uber Pai', 12.42, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Uber Pai', 10.38, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Uber Volta Consulta', 14.20, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Uber Volta Consulta', 16.49, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Vale: Padaria', 16.45, 'expense', 'debit', '2026-03-05 12:00:00+00'),
('Vale: Padaria', 15.98, 'expense', 'debit', '2026-03-05 12:00:00+00');

-- 06/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Letícia', 5.00, 'expense', 'debit', '2026-03-06 12:00:00+00'),
('Uber volta Aiko', 44.98, 'expense', 'debit', '2026-03-06 12:00:00+00'),
('Uber volta da Letícia', 29.05, 'expense', 'debit', '2026-03-06 12:00:00+00'),
('Lanchonete', 13.00, 'expense', 'debit', '2026-03-06 12:00:00+00'),
('Almoço', 26.00, 'expense', 'debit', '2026-03-06 12:00:00+00');

-- 07/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Vale: Padaria', 38.00, 'expense', 'debit', '2026-03-07 12:00:00+00'),
('Taz burguer', 45.98, 'expense', 'debit', '2026-03-07 12:00:00+00');

-- 09/03
INSERT INTO transactions (description, amount, type, payment_method, created_at) VALUES
('Letícia conta luz', 400.00, 'expense', 'debit', '2026-03-09 12:00:00+00'),
('Freela Parcela 4 de 5 SisZoo', 800.00, 'income', 'debit', '2026-03-09 12:00:00+00'),
('Freela SisZoo Backup', 131.00, 'income', 'debit', '2026-03-09 12:00:00+00'),
('Seguro incêndio e fiança', 432.00, 'expense', 'debit', '2026-03-09 12:00:00+00'),
('Uber identidade pai', 13.57, 'expense', 'debit', '2026-03-09 12:00:00+00'),
('Uber identidade pai', 10.37, 'expense', 'debit', '2026-03-09 12:00:00+00');
