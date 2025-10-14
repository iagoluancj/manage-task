import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('quick_notes')
            .select('*')
            .single();

        if (error) {
            // Se não existir, retornar valor padrão
            return NextResponse.json({
                notes: `DE CASA
- Agendar psiquiatra
- scrapper acs
- Angelita: 30796205

A COMPRAR:
- Bolsa térmica comida
- Minoxidil 
- Blusa academia
- gelatina 
- Meias

FAZER:
- foto família
- orar todo dia
- olhar casas
- continuar com backup
----- fazer backup dos demais arquivos

Agendados
- 14/10 - 16:00 Fernand`
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao buscar notas:', error);
        return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { notes } = await req.json();

        const { data, error } = await supabase
            .from('quick_notes')
            .upsert({ id: 1, notes })
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar notas:', error);
            return NextResponse.json({ error: 'Erro ao salvar notas' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao atualizar notas:', error);
        return NextResponse.json({ error: 'Erro ao atualizar notas' }, { status: 500 });
    }
}



