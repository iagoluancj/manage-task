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
  return user === 'leticia' ? 'leticia_quick_notes' : 'quick_notes';
}

export async function GET(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        const tableName = getTableName(user);
        
        const { data, error } = await supabase
            .from(tableName)
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
        const user = getUserFromRequest(req);
        const tableName = getTableName(user);
        const { notes } = await req.json();

        const { data, error } = await supabase
            .from(tableName)
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







