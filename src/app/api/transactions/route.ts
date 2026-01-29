import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

export interface Transaction {
    id?: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'invoice_payment'; // 'income' para entradas (+), 'expense' para saídas (-), 'invoice_payment' para faturas pagas
    payment_method?: 'credit' | 'debit'; // default credit
    created_at?: string;
    category?: string; // Para futuras categorizações
    tags?: string[] | string | null;
}

// GET - Buscar todas as transações
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar transações:', error);
            return NextResponse.json({ transactions: [] });
        }

        return NextResponse.json({ transactions: data || [] });
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        return NextResponse.json({ transactions: [] });
    }
}

// POST - Criar nova transação
export async function POST(req: NextRequest) {
    try {
        const { description, amount, type, paymentMethod, tags } = await req.json();

        if (!description || amount === undefined || !type) {
            return NextResponse.json(
                { error: 'Descrição, valor e tipo são obrigatórios' },
                { status: 400 }
            );
        }

        let normalizedTags: string[] | null = null;

        if (Array.isArray(tags)) {
            normalizedTags = tags
                .map((tag) => String(tag).trim())
                .filter(Boolean);
        } else if (typeof tags === 'string') {
            const trimmed = tags.trim();
            normalizedTags = trimmed ? [trimmed] : [];
        }

        if (!normalizedTags || normalizedTags.length === 0) {
            return NextResponse.json(
                { error: 'Tag é obrigatória' },
                { status: 400 }
            );
        }

        const payment_method: 'credit' | 'debit' = paymentMethod === 'debit' ? 'debit' : 'credit';

        const { data, error } = await supabase
            .from('transactions')
            .insert([
                {
                    description: description.trim(),
                    amount: Math.abs(amount), // Sempre positivo, o tipo define se é entrada ou saída
                    type: type,
                    payment_method,
                    tags: normalizedTags,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar transação:', error);
            return NextResponse.json(
                { error: 'Erro ao criar transação' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao processar transação:', error);
        return NextResponse.json(
            { error: 'Erro ao processar transação' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar tags da transação
export async function PUT(req: NextRequest) {
    try {
        const { id, tags } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: 'ID da transação é obrigatório' },
                { status: 400 }
            );
        }

        let normalizedTags: string[] | null = null;

        if (Array.isArray(tags)) {
            normalizedTags = tags
                .map((tag) => String(tag).trim())
                .filter(Boolean);
        } else if (typeof tags === 'string') {
            const trimmed = tags.trim();
            normalizedTags = trimmed ? [trimmed] : [];
        }

        if (normalizedTags && normalizedTags.length === 0) {
            normalizedTags = null;
        }

        const { data, error } = await supabase
            .from('transactions')
            .update({ tags: normalizedTags })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar tags:', error);
            return NextResponse.json(
                { error: 'Erro ao atualizar tags' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao processar atualização:', error);
        return NextResponse.json(
            { error: 'Erro ao processar atualização' },
            { status: 500 }
        );
    }
}

// DELETE - Deletar transação
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: 'ID da transação é obrigatório' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar transação:', error);
            return NextResponse.json(
                { error: 'Erro ao deletar transação' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: 'Transação deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao processar deleção:', error);
        return NextResponse.json(
            { error: 'Erro ao processar deleção' },
            { status: 500 }
        );
    }
}


