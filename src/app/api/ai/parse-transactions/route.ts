import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const APP_SECRETS_TABLE = "app_secrets";

async function getGroqApiKey(): Promise<string | null> {
  const fromEnv = process.env.GROQ_API_KEY;
  if (fromEnv?.trim()) return fromEnv.trim();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from(APP_SECRETS_TABLE)
    .select("value")
    .eq("key", "GROQ_API_KEY")
    .maybeSingle();

  if (error || !data?.value) return null;
  return String(data.value).trim();
}

type ParsedTransaction = {
  description: string;
  amount: number;
  type: "income" | "expense" | "invoice_payment";
  paymentMethod: "credit" | "debit";
  date?: string;
};

type AiResponse = {
  transactions: ParsedTransaction[];
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = await getGroqApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY não configurada. Defina no .env ou na tabela app_secrets no Supabase." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const input: string = String(body?.input ?? "").trim();

    if (!input) {
      return NextResponse.json(
        { error: "Campo 'input' é obrigatório." },
        { status: 400 }
      );
    }

    // Contexto de data do servidor (usado para 'hoje' e 'ontem')
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayIso = `${yyyy}-${mm}-${dd}`;
    const todayBr = `${dd}/${mm}/${yyyy}`;

    const knownDescriptions = [
      "Xerox",
      "Vivo",
      "Válvula Gás",
      "Valorant x3",
      "Vale: Uber",
      "Vale: Supermercado",
      "Vale: Padaria",
      "Unha Eny",
      "Uber volta vigano",
      "Uber volta Letícia e eu",
      "Uber volta Letícia",
      "Uber volta da Letícia",
      "Uber Volta Consulta",
      "Uber volta Aiko",
      "Uber to Letícia",
      "Uber to Aiko",
      "Uber Pai",
      "Uber Letícia volta trabalho",
      "Uber Leticia Trabalho",
      "Uber Letícia",
      "Uber Internação Pai",
      "Uber identidade pai",
      "Uber Ida Consulta",
      "Uber ida cigano",
      "Uber hospital pai",
      "Uber Eny Pai",
      "Uber certidão pai",
      "Uber até Letícia",
      "Uber",
      "Três cigarros",
      "Todas Contas Fixas",
      "Supermercado",
      "Supabase",
      "Sorvete",
      "Salgado",
      "Sacolão",
      "Sabão em pó",
      "Ração",
      "Psicólogo Iago x3",
      "Psicólogo Eny",
      "Presentes natal",
      "Planta",
      "Pizza",
      "Pizza Letícia x3",
      "Pastel",
      "Pastéis e coxinha",
      "Papelaria",
      "Pão",
      "Panela, Sabão em Pó, Gelatina, Vanish x8",
      "Pagamento Fatura Cartão Crédito",
      "Padaria",
      "NuBank",
      "Next",
      "Monster",
      "Meli+",
      "Master x4",
      "Marmitex",
      "Marmita",
      "Loteria",
      "Lanchonete",
      "Hostinger",
      "Hamburguer x4",
      "Google fotos",
      "Freela Plataforma MR Cursos",
      "Freela Parcela 4 de 5 SisZoo",
      "Freela SisZoo Backup",
      "Frango assado",
      "Frango",
      "Farmácia",
      "Drogaria",
      "Decimo Terceiro",
      "Cursor x4",
      "Crédito TIM",
      "Coxinha e coca",
      "Compra BH",
      "Comida hospital pai",
      "Combo Ifood",
      "Cigarro Leticia",
      "Cigarro Eny",
      "Cigarro",
      "Cerveja Eny",
      "Cartão Todos Pai",
      "Cabelo",
      "Bolo",
      "Bis",
      "BH x3",
      "Baralho,  cigarros e chiclete x3",
      "Anuncio WA Buis",
      "Amazon prime",
      "Almoço",
      "Agua de coco",
      "Açougue",
      "Açaí",
      "2 Marmitex"
    ];

    const systemPrompt = `
Você é um parser de transações financeiras para um app pessoal.
Entrada: texto livre em português descrevendo despesas e receitas.
Saída: SOMENTE JSON válido, SEM explicações, no formato:
{
  "transactions": [
    {
      "description": string,
      "amount": number,
      "type": "income" | "expense" | "invoice_payment",
      "paymentMethod": "credit" | "debit",
      "date": "YYYY-MM-DD"
    }
  ]
}

Regras importantes:
- Hoje é exatamente: ${todayBr} (ISO: ${todayIso}).
- Quando o usuário disser "hoje", use SEMPRE a data ${todayIso}.
- Quando o usuário disser "ontem", use SEMPRE a data um dia antes de ${todayIso}.
- Quando disser "anteontem", use SEMPRE a data dois dias antes de ${todayIso}.
- Use "description" preferencialmente a partir desta lista conhecida (quando fizer sentido):
  ${knownDescriptions.join(", ")}.
- Se for pagamento de fatura de cartão, use exatamente:
  description = "Pagamento Fatura Cartão Crédito",
  type = "invoice_payment",
  paymentMethod = "credit".
- Entradas (salário, freela, etc.): type = "income" e paymentMethod = "debit".
- Saídas normais: type = "expense". O paymentMethod deve ser "credit" ou "debit" conforme o texto.
- Se o texto não disser nada de forma clara sobre crédito/débito:
  - se parecer cartão, use "credit"
  - caso contrário, use "debit".
- Datas:
  - Converta expressões como "ontem", "hoje" ou "27/02" para "YYYY-MM-DD".
  - Se o ano não estiver explícito, assuma o ano atual do sistema.
- amount é sempre número com ponto decimal (ex: 19.9 para R$ 19,90).
- NUNCA retorne comentários ou texto fora do JSON.
`.trim();

    const groqBody = {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ],
      temperature: 0.1
    };

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(groqBody)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Erro ao chamar Groq:", response.status, text);
      return NextResponse.json(
        { error: "Erro ao chamar o provedor de IA." },
        { status: 500 }
      );
    }

    const data = await response.json();
    let content: string | undefined =
      data.choices?.[0]?.message?.content ?? data.choices?.[0]?.message?.content?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: "Resposta vazia da IA." },
        { status: 500 }
      );
    }

    // Alguns modelos podem devolver o JSON dentro de ```json ... ```.
    // Aqui removemos cercas de código e pegamos apenas o trecho JSON.
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.slice(firstBrace, lastBrace + 1).trim();
    }

    let parsed: AiResponse;
    try {
      parsed = JSON.parse(content) as AiResponse;
    } catch (error) {
      console.error("Falha ao fazer parse do JSON da IA:", error, content);
      return NextResponse.json(
        { error: "Não foi possível interpretar a resposta da IA." },
        { status: 500 }
      );
    }

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      return NextResponse.json(
        { error: "Formato de resposta inválido da IA." },
        { status: 500 }
      );
    }

    const safeTransactions: ParsedTransaction[] = parsed.transactions
      .filter((t) => t && typeof t.description === "string" && typeof t.amount === "number")
      .map((t) => ({
        description: t.description.trim(),
        amount: Math.abs(t.amount),
        type: t.type,
        paymentMethod: t.paymentMethod,
        date: t.date
      }));

    return NextResponse.json({ transactions: safeTransactions });
  } catch (error) {
    console.error("Erro em /api/ai/parse-transactions:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar texto com IA." },
      { status: 500 }
    );
  }
}

