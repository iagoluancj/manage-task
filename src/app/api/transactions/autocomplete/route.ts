import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

// Helper para pegar o usuário do cookie
function getUserFromRequest(req: NextRequest): string {
  const user = req.cookies.get('app_user')?.value || 'iago';
  return user;
}

// Helper para pegar o nome da tabela baseado no usuário
function getTableName(user: string): string {
  return user === 'leticia' ? 'leticia_transactions' : 'transactions';
}

// GET - Buscar descrições para autocomplete
export async function GET(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        const tableName = getTableName(user);
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';

        if (!query || query.length < 2) {
            return NextResponse.json({ suggestions: [] });
        }

        const { data, error } = await supabase
            .from(tableName)
            .select('description')
            .ilike('description', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Erro ao buscar sugestões:', error);
            return NextResponse.json({ suggestions: [] });
        }

        // Remove duplicatas e retorna apenas descrições únicas
        const uniqueDescriptions = Array.from(
            new Set(data?.map((t) => t.description) || [])
        );

        return NextResponse.json({ suggestions: uniqueDescriptions });
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        return NextResponse.json({ suggestions: [] });
    }
}






