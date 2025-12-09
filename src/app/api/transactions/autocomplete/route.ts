import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

// GET - Buscar descrições para autocomplete
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';

        if (!query || query.length < 2) {
            return NextResponse.json({ suggestions: [] });
        }

        const { data, error } = await supabase
            .from('transactions')
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

