import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('routines')
            .select('*')
            .single();

        if (error) {
            // Se não existir, retornar valores padrão
            return NextResponse.json({
                work: [
                    { time: "🕔 05:00", activity: "Acordar" },
                    { time: "🚗 05:30", activity: "Sair de casa" },
                    { time: "🛒 08:00", activity: "Comprar energético (x1) e iogurte (x2 de 170 ml) → Colocar na bolsa térmica e deixar na geladeira" },
                    { time: "🥣 10:30", activity: "Comer iogurte com granola" },
                    { time: "🍛 12:00", activity: "Almoçar" },
                    { time: "⚡ 14:00", activity: "Tomar energético" },
                    { time: "⚡ 15:00", activity: "Olhar tickets novos / Olhar tickets da BRC / Olhar meus tickets / Olhar tickets da fila do eduardo / fazer OKR" },
                    { time: "🥣 17:00", activity: "Comer iogurte com granola" },
                    { time: "🏋️ 19:00", activity: "Ir para a academia" },
                    { time: "🏠 20:30", activity: "Voltar para casa" },
                    { time: "🧼 22:50", activity: "Tomar banho e levar cueca" },
                    { time: "😴 23:00", activity: "Dormir" },
                ],
                off: [
                    { time: "🕕 06:00", activity: "Acordar e trabalhar até 10:00" },
                    { time: "🎮 10:00–12:00", activity: "Jogar ou descansar" },
                    { time: "🍳 12:00", activity: "Fazer almoço/janta" },
                    { time: "📖 13:00", activity: "Ver algo ou ler" },
                    { time: "🎮 14:00", activity: "Jogar uma partida" },
                    { time: "🏋️ 15:00–16:00", activity: "Ir à academia" },
                    { time: "💻 16:00–19:00", activity: "Trabalhar" },
                    { time: "🍱 19:00–20:00", activity: "Fazer marmita e colocar na bolsa térmica" },
                    { time: "🎮 20:00–21:00", activity: "Jogar mais uma partida" },
                    { time: "📞 21:00–22:00", activity: "Ligar para a Letícia" },
                    { time: "📚 22:00", activity: "Ler algo e dormir" },
                ]
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao buscar rotinas:', error);
        return NextResponse.json({ error: 'Erro ao buscar rotinas' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { type, routine } = await req.json();

        const { data, error } = await supabase
            .from('routines')
            .upsert({ id: 1, [type]: routine })
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar rotina:', error);
            return NextResponse.json({ error: 'Erro ao salvar rotina' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao atualizar rotina:', error);
        return NextResponse.json({ error: 'Erro ao atualizar rotina' }, { status: 500 });
    }
}
