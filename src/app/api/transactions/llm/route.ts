import { NextRequest, NextResponse } from 'next/server';

type TransactionType = 'income' | 'expense' | 'invoice_payment';
type PaymentMethod = 'credit' | 'debit';

interface ParsedTransaction {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
}

const VALID_TYPES: TransactionType[] = ['income', 'expense', 'invoice_payment'];
const VALID_METHODS: PaymentMethod[] = ['credit', 'debit'];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeParsedTransaction = (value: unknown): ParsedTransaction | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const descriptionRaw = typeof candidate.description === 'string' ? candidate.description : '';
  const description = descriptionRaw.trim().replace(/\s+/g, ' ').slice(0, 120);
  const amountNumber = toNumber(candidate.amount);
  const type = typeof candidate.type === 'string' ? (candidate.type as TransactionType) : null;
  const paymentMethodRaw =
    typeof candidate.paymentMethod === 'string' ? (candidate.paymentMethod as PaymentMethod) : null;

  if (!description || amountNumber === null || amountNumber <= 0) {
    return null;
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return null;
  }

  let paymentMethod: PaymentMethod;
  if (type === 'income') {
    paymentMethod = 'debit';
  } else if (type === 'invoice_payment') {
    paymentMethod = 'credit';
  } else if (paymentMethodRaw && VALID_METHODS.includes(paymentMethodRaw)) {
    paymentMethod = paymentMethodRaw;
  } else {
    paymentMethod = 'credit';
  }

  return {
    description,
    amount: Math.abs(Number(amountNumber.toFixed(2))),
    type,
    paymentMethod
  };
};

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (typeof input !== 'string' || !input.trim()) {
      return NextResponse.json(
        { error: 'Texto para interpretar é obrigatório.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const normalizedInput = normalizeText(input);

    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'Você extrai UMA transação financeira em JSON válido. ' +
              'Sempre retorne apenas JSON sem texto extra com chaves: description, amount, type, paymentMethod. ' +
              'type deve ser income, expense ou invoice_payment. ' +
              'paymentMethod deve ser credit ou debit.'
          },
          {
            role: 'user',
            content:
              `Texto do usuário: "${input}". ` +
              'Regras: ' +
              '1) amount sempre positivo. ' +
              '2) Se for pagamento de fatura/cartão de crédito => type=invoice_payment e paymentMethod=credit. ' +
              '3) Se for entrada/recebimento/salário => type=income e paymentMethod=debit. ' +
              '4) Caso contrário type=expense. Se mencionar débito/pix/dinheiro => paymentMethod=debit; senão credit. ' +
              `5) Mantenha description curta e clara. Texto normalizado para referência: "${normalizedInput}".`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'transaction_extraction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                amount: { type: 'number' },
                type: { type: 'string', enum: VALID_TYPES },
                paymentMethod: { type: 'string', enum: VALID_METHODS }
              },
              required: ['description', 'amount', 'type', 'paymentMethod'],
              additionalProperties: false
            }
          }
        }
      })
    });

    const completionData = await completionRes.json();

    if (!completionRes.ok) {
      const message =
        typeof completionData?.error?.message === 'string'
          ? completionData.error.message
          : 'Falha ao interpretar transação com IA.';

      return NextResponse.json({ error: message }, { status: 502 });
    }

    const content = completionData?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'A IA não retornou um conteúdo válido.' },
        { status: 422 }
      );
    }

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Não foi possível interpretar a resposta da IA.' },
        { status: 422 }
      );
    }

    const normalizedTransaction = normalizeParsedTransaction(parsedContent);
    if (!normalizedTransaction) {
      return NextResponse.json(
        { error: 'A IA retornou uma transação incompleta ou inválida.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ transaction: normalizedTransaction });
  } catch (error) {
    console.error('Erro na interpretação de transação via IA:', error);
    return NextResponse.json(
      { error: 'Erro interno ao interpretar transação via IA.' },
      { status: 500 }
    );
  }
}
