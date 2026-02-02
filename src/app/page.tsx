"use client";

import styled, { css, keyframes } from "styled-components";
import { useEffect, useState, useRef, useCallback, useMemo, FormEvent } from "react";
import { differenceInDays, differenceInHours, isBefore } from "date-fns";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { FaTrash, FaExclamationTriangle, FaClock, FaCheckCircle, FaCalendarAlt } from "react-icons/fa";
import { FaTasks } from "react-icons/fa";
import { MdArrowDownward, MdArrowUpward, MdCreditCard } from "react-icons/md";

import toast, { Toaster } from 'react-hot-toast';

interface Task {
  name: string;
  startDate: string;
  endDate: string;
}

interface Topic {
  topic: string;
  tasks: Task[];
}

interface Section {
  section: string;
  sectionitens: Topic[];
}

interface TaskStatus {
  color: string;
  bgColor: string;
  borderColor: string;
  status: string;
  icon: React.ComponentType;
  label: string;
  daysText: string;
  isOverdue?: boolean;
}

interface Transaction {
  id?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'invoice_payment';
  paymentMethod?: 'credit' | 'debit';
  created_at?: string;
  category?: string;
  tags?: string[] | string | null;
}

interface NubankParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  amountLabel: string;
  tag: string;
  sourceFile: string;
}

type ExpenseReportItem = Transaction & {
  multiplier: number;
  effectiveAmount: number;
};

interface ExpenseGroup {
  key: string;
  name: string;
  total: number;
  count: number;
  items: ExpenseReportItem[];
}

interface ExpenseSummaryCard {
  id: string;
  label: string;
  total: number;
  count: number;
  hint: string;
  items: string[];
}

interface ExpenseMonthReport {
  key: string;
  label: string;
  total: number;
  count: number;
  topGroupsByCount: ExpenseSummaryCard[];
  topGroupsByValue: ExpenseSummaryCard[];
  categoryCards: ExpenseSummaryCard[];
  groups: ExpenseGroup[];
}

const urgentPulse = keyframes`
  0% { 
    background: linear-gradient(135deg, #fef2f2 0%, #fecaca 30%, #fef2f2 100%);
    box-shadow: 0 4px 8px rgba(220, 38, 38, 0.15);
  }
  50% { 
    background: linear-gradient(135deg, #fef2f2 0%, #f87171 40%, #fef2f2 100%);
    box-shadow: 0 6px 12px rgba(220, 38, 38, 0.25);
  }
  100% { 
    background: linear-gradient(135deg, #fef2f2 0%, #fecaca 30%, #fef2f2 100%);
    box-shadow: 0 4px 8px rgba(220, 38, 38, 0.15);
  }
`;

const urgentGlow = keyframes`
  0% { 
    border-color: #fca5a5;
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.3);
  }
  50% { 
    border-color: #dc2626;
    box-shadow: 0 0 0 12px rgba(220, 38, 38, 0.08);
  }
  100% { 
    border-color: #fca5a5;
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.3);
  }
`;

const urgentBounce = keyframes`
  0%, 100% { 
    transform: translateY(0);
  }
  25% { 
    transform: translateY(-2px);
  }
  75% { 
    transform: translateY(-1px);
  }
`;

const normalizeText = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const stripMultiplierSuffix = (value: string) => {
  return value.replace(/\s*x\s*\d+$/i, '').trim();
};

const formatCurrency = (value: number) => value.toFixed(2).replace('.', ',');

const formatMonthLabel = (date: Date) => {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getMonthKey = (dateValue?: string) => {
  if (!dateValue) {
    return { key: 'sem-data', label: 'Sem data' };
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return { key: 'sem-data', label: 'Sem data' };
  }

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { key, label: formatMonthLabel(date) };
};

const formatDateTime = (dateValue?: string) => {
  if (!dateValue) {
    return 'Sem data';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const parseTags = (tagsInput?: Transaction['tags']) => {
  if (!tagsInput) {
    return [];
  }

  if (Array.isArray(tagsInput)) {
    return tagsInput.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tagsInput === 'string') {
    const trimmed = tagsInput.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((tag) => String(tag).trim()).filter(Boolean);
        }
      } catch {
        // fallback para split
      }
    }

    return trimmed
      .split(/[;,|]/g)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const DEFAULT_TAG_OPTIONS = [
  'uber',
  'entrada',
  'casa',
  'farmacia',
  'fatura',
  'refeicoes',
  'saude',
  'presente',
  'assinatura',
  'padaria',
  'mercado',
  'supermercado',
  'tabaco',
  'roupa',
  'pet',
  'telefonia',
  'conta fixa',
  'emprestimo',
  'banco',
  'servico',
  'desconhecido'
];

const AUTO_TAG_EXACT_ENTRIES: Array<[string, string[]]> = [
  ['Uber volta Letícia e eu', ['uber']],
  ['Freela SisZoo Metade do valor (primeira parte)', ['entrada']],
  ['Torneira e Vela p filtro', ['casa']],
  ['Farmacia Tratamento ferida pai', ['farmacia']],
  ['Pagamento Fatura Cartão Crédito', ['fatura']],
  ['Xerox', ['casa']],
  ['Comida natal x3', ['refeicoes']],
  ['Cabelo x3', ['saude']],
  ['Aniversário', ['presente']],
  ['Supasbase x4', ['assinatura']],
  ['Bolo', ['padaria']],
  ['Uber Internação Pai', ['uber']],
  ['Tampa vaso x2', ['casa']],
  ['Açaí', ['refeicoes']],
  ['Uber Ida Consulta', ['uber']],
  ['Café e açúcar', ['mercado']],
  ['Sombra Eny', ['saude']],
  ['Uber Letícia', ['uber']],
  ['Uber até Letícia', ['uber']],
  ['Mortadela', ['mercado']],
  ['Master x4', ['refeicoes']],
  ['Pão', ['padaria']],
  ['Farmácia', ['farmacia']],
  ['Presentes natal', ['presente']],
  ['Hostinger', ['assinatura']],
  ['Uber hospital pai', ['uber']],
  ['Roupa eny x3', ['roupa']],
  ['Remédios pai', ['farmacia']],
  ['Compra BH', ['mercado']],
  ['Salgado integral', ['padaria']],
  ['Supermercado', ['supermercado']],
  ['Carne', ['supermercado']],
  ['Gaveteiro X3', ['casa']],
  ['Pizza x4', ['refeicoes']],
  ['Pastel', ['padaria']],
  ['Meli+', ['assinatura']],
  ['Pão de queijo', ['padaria']],
  ['Garrafinha pai', ['casa']],
  ['Uber', ['uber']],
  ['Açai', ['refeicoes']],
  ['Uber certidão pai', ['uber']],
  ['Eny maconha', ['tabaco']],
  ['Remédios pai x4', ['farmacia']],
  ['Bicicleta x10', ['saude']],
  ['Freela Parcela 1 de 5 SisZoo', ['entrada']],
  ['Maionese', ['supermercado']],
  ['Salgado e água de coco', ['padaria']],
  ['Ciclete', ['padaria']],
  ['BHx3', ['mercado']],
  ['Uber volta Letícia', ['uber']],
  ['Uber identidade pai', ['uber']],
  ['Dipirona', ['farmacia']],
  ['Dúzia ovos', ['mercado']],
  ['Açougue', ['mercado']],
  ['Lanche', ['padaria']],
  ['Cigarro e Refrigerante', ['tabaco']],
  ['Baralho,  cigarros e chiclete x3', ['tabaco']],
  ['Cerveja Eny', ['tabaco']],
  ['Uber Eny Pai', ['uber']],
  ['Uber Pai', ['uber']],
  ['Frango', ['mercado']],
  ['Crédito TIM', ['telefonia']],
  ['Uber Volta Consulta', ['uber']],
  ['Cabelo', ['saude']],
  ['Valorant x3', ['assinatura']],
  ['Certidão nascimento pai', ['banco']],
  ['Ansitec 10mg 60comp x3', ['farmacia']],
  ['Uber volta da Letícia', ['uber']],
  ['Next', ['banco']],
  ['Pastéis e coxinha', ['padaria']],
  ['Salado', ['padaria']],
  ['Ração', ['pet']],
  ['Combo Ifood', ['refeicoes']],
  ['Entrega Eny', ['servico']],
  ['Psicólogo Iago x3', ['saude']],
  ['Pasta de dente', ['mercado']],
  ['Psicologo Eny', ['saude']],
  ['Almoço', ['refeicoes']],
  ['Cigarro eny', ['tabaco']],
  ['Suporte e cadeado x8', ['casa']],
  ['Freela MR Cursos Mod2', ['entrada']],
  ['Cigarro', ['tabaco']],
  ['Freela SisZoo Backup', ['entrada']],
  ['Uber ida cigano', ['uber']],
  ['Supermercado x3', ['supermercado']],
  ['Cigarro Eny', ['tabaco']],
  ['Sabão em pó', ['mercado']],
  ['Todas Contas Fixas', ['conta fixa']],
  ['Válvula Gás', ['casa']],
  ['Psicólogo Eny', ['saude']],
  ['Planta', ['casa']],
  ['Empréstimo Letícia', ['emprestimo']],
  ['Uber volta vigano', ['uber']],
  ['Pizza Letícia x3', ['refeicoes']],
  ['Coxinha costela', ['padaria']],
  ['Vivo', ['telefonia']],
  ['Papelaria', ['casa']],
  ['Unha Eny', ['saude']],
  ['Supabase', ['assinatura']],
  ['Uber to Aiko', ['uber']],
  ['Amazon prime', ['assinatura']],
  ['Cursor x4', ['assinatura']],
  ['Anuncio WA Buis', ['assinatura']],
  ['Google fotos', ['assinatura']],
  ['Carregador Not', ['casa']],
  ['Pão dormido', ['padaria']],
  ['Colchão Pai x6', ['casa']],
  ['Freela Plataforma MR Cursos', ['entrada']],
  ['Revellion Viganó', ['presente']],
  ['NuBank', ['banco']],
  ['Agua de coco', ['padaria']],
  ['Coxinha e coca', ['padaria']],
  ['2 Marmitex', ['refeicoes']],
  ['Salgado', ['padaria']],
  ['BH x3', ['mercado']],
  ['Dissidio', ['entrada']],
  ['Refrigerante pai', ['mercado']],
  ['Uber Leticia Trabalho', ['uber']],
  ['Padaria', ['padaria']],
  ['Três cigarros', ['tabaco']],
  ['Uber to Letícia', ['uber']],
  ['Decimo Terceiro', ['entrada']],
  ['Refrigerante', ['mercado']],
  ['Mata Mosquito', ['casa']],
  ['Roupa pai x2', ['roupa']]
];

const AUTO_TAG_EXACT_MAP = new Map<string, string[]>(
  AUTO_TAG_EXACT_ENTRIES.map(([description, tags]) => [normalizeText(description), tags])
);

const AUTO_TAG_RULES: Array<{ tags: string[]; keywords: string[] }> = [
  { tags: ['uber'], keywords: ['uber to aiko', 'uber aiko'] },
  { tags: ['uber'], keywords: ['uber'] },
  { tags: ['fatura'], keywords: ['fatura', 'cartao credito'] },
  { tags: ['emprestimo'], keywords: ['emprestimo'] },
  { tags: ['entrada'], keywords: ['freela', 'dissidio', 'decimo', 'decimo terceiro'] },
  { tags: ['telefonia'], keywords: ['vivo', 'tim'] },
  { tags: ['conta fixa'], keywords: ['conta fixa', 'contas fixas'] },
  { tags: ['assinatura'], keywords: ['supabase', 'hostinger', 'amazon prime', 'google fotos', 'meli', 'cursor', 'valorant'] },
  { tags: ['servico'], keywords: ['entrega', 'servico'] },
  { tags: ['presente'], keywords: ['presente', 'aniversario', 'revellion'] },
  { tags: ['tabaco'], keywords: ['cigarro', 'cigarros', 'maconha', 'cerveja'] },
  { tags: ['pet'], keywords: ['racao'] },
  { tags: ['roupa'], keywords: ['roupa'] },
  { tags: ['saude'], keywords: ['psicolog', 'cabelo', 'unha', 'sombra'] },
  { tags: ['farmacia'], keywords: ['farmacia', 'remedio', 'medicamento', 'dipirona', 'ansitec'] },
  { tags: ['padaria'], keywords: ['padaria', 'pao', 'coxinha', 'salgado', 'pastel', 'lanche', 'bolo', 'agua de coco', 'ciclete'] },
  { tags: ['refeicoes'], keywords: ['pizza', 'marmitex', 'ifood', 'acai', 'almoco', 'comida natal', 'master'] },
  { tags: ['supermercado'], keywords: ['supermercado', 'maionese', 'carne'] },
  { tags: ['mercado'], keywords: ['mercado', 'compra', 'bh', 'acougue', 'frango', 'mortadela', 'ovos', 'refrigerante', 'sabao', 'pasta de dente', 'cafe'] },
  { tags: ['casa'], keywords: ['torneira', 'valvula', 'suporte', 'cadeado', 'gaveteiro', 'carregador', 'colchao', 'papelaria', 'planta', 'mata mosquito', 'garrafinha', 'tampa vaso', 'xerox'] },
  { tags: ['banco'], keywords: ['nubank', 'next', 'banco', 'certidao'] }
];

const inferTagsFromDescription = (description: string, knownTagMap: Map<string, string[]>) => {
  const normalized = normalizeText(stripMultiplierSuffix(description));
  if (!normalized) {
    return [];
  }

  const known = knownTagMap.get(normalized);
  if (known && known.length > 0) {
    return known;
  }

  const exact = AUTO_TAG_EXACT_MAP.get(normalized);
  if (exact && exact.length > 0) {
    return exact;
  }

  const rule = AUTO_TAG_RULES.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return rule?.tags ?? [];
};

const MAX_CARD_ITEMS = 3;
const MAX_TOOLTIP_ITEMS = 10;

const limitTooltipItems = (items: string[], limit = MAX_TOOLTIP_ITEMS) => {
  if (items.length <= limit) {
    return items;
  }

  return [...items.slice(0, limit), `+${items.length - limit} outros`];
};

const buildGroupTooltipItems = (items: ExpenseReportItem[]) => {
  return items
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    })
    .map((item) => {
      const cleanedName = stripMultiplierSuffix(item.description) || item.description;
      const amountLabel = item.multiplier > 1
        ? `R$ ${formatCurrency(item.effectiveAmount)} (x${item.multiplier})`
        : `R$ ${formatCurrency(item.amount)}`;
      return `${cleanedName} - ${amountLabel}`;
    });
};

const buildCategoryTooltipItems = (itemsMap: Map<string, number>) => {
  return Array.from(itemsMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `${name} (${count})`);
};

const buildTooltipTitle = (items: string[]) => {
  if (items.length === 0) {
    return 'Nenhum item encontrado';
  }

  return items.join('\n');
};

const NUBANK_SECTION_START = /^TRANSAÇÕES DE/i;
const NUBANK_SECTION_END = /^(PAGAMENTOS E FINANCIAMENTOS|RESUMO DA FATURA|PRÓXIMAS FATURAS|LIMITES DISPONÍVEIS|VALOR MÁXIMO PARA TRANSAÇÕES|FATURA)/i;
const NUBANK_DATE_REGEX = /^(\d{2})\s+([A-Z]{3})\b/;
const NUBANK_AMOUNT_REGEX = /-?\s*R\$\s*[\d.]+,\d{2}/g;

const parseBrazilianCurrency = (value: string) => {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const extractNubankSectionLines = (text: string) => {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let inSection = false;
  const sectionLines: string[] = [];

  lines.forEach((line) => {
    if (NUBANK_SECTION_START.test(line)) {
      inSection = true;
      return;
    }
    if (inSection && NUBANK_SECTION_END.test(line)) {
      inSection = false;
      return;
    }
    if (inSection) {
      sectionLines.push(line);
    }
  });

  return sectionLines;
};

const cleanNubankDescription = (line: string) => {
  let description = line.replace(NUBANK_DATE_REGEX, '').trim();
  description = description.replace(/•{2,}\s*\d{4}\s*/g, '').trim();
  description = description.replace(/-?\s*R\$\s*[\d.]+,\d{2}/g, '').trim();
  return description;
};

const parseNubankTransactionsFromText = (
  text: string,
  sourceFile: string,
  knownTagMap: Map<string, string[]>
) => {
  const lines = extractNubankSectionLines(text);
  const entries: Array<{ date: string; lines: string[] }> = [];
  let current: { date: string; lines: string[] } | null = null;

  lines.forEach((line) => {
    const dateMatch = line.match(NUBANK_DATE_REGEX);
    if (dateMatch) {
      if (current) {
        entries.push(current);
      }
      current = { date: `${dateMatch[1]} ${dateMatch[2]}`, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  });

  if (current) {
    entries.push(current);
  }

  return entries
    .map((entry, index) => {
      const combined = entry.lines.join(' ');
      const amountMatches = combined.match(NUBANK_AMOUNT_REGEX) ?? [];
      const amountRaw = amountMatches[amountMatches.length - 1] ?? '';
      if (!amountRaw) {
        return null;
      }

      const amountValue = parseBrazilianCurrency(amountRaw);
      const amount = amountRaw.includes('-') ? -amountValue : amountValue;
      let description = cleanNubankDescription(entry.lines[0]);

      if (!description) {
        const fallbackLine = entry.lines.find((line) => !line.startsWith('USD') && !line.startsWith('Conversão'));
        description = fallbackLine ? cleanNubankDescription(fallbackLine) : 'Transação';
      }

      const suggestedTags = inferTagsFromDescription(description, knownTagMap);
      const tag = suggestedTags[0] ?? 'desconhecido';

      return {
        id: `${sourceFile}-${index}-${entry.date}`,
        date: entry.date,
        description,
        amount,
        amountLabel: amountRaw.replace(/\s+/g, ' ').trim(),
        tag,
        sourceFile
      } as NubankParsedTransaction;
    })
    .filter((entry): entry is NubankParsedTransaction => Boolean(entry));
};

const formatTagLabel = (tag: string) => {
  if (!tag) {
    return '';
  }

  return tag
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Home() {
  const [editedTopics, setEditedTopics] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [topics, setTopics] = useState<Section[]>([]);
  const [isEdited, setIsEdited] = useState(false);
  const [visibleSections, setVisibleSections] = useState<boolean[]>([]);
  const [editingDate, setEditingDate] = useState<{ topicIndex: number; taskIndex: number; field: string } | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ topicIndex: number } | null>(null);
  const [editingName, setEditingName] = useState<{ topicIndex: number; taskIndex: number } | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [addingTaskIndex, setAddingTaskIndex] = useState<number | null>(null);
  const [pendingDeletions, setPendingDeletions] = useState<{ section: string; topic?: string; task?: string }[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Estados para rotina
  const [newRoutineTime, setNewRoutineTime] = useState("");
  const [newRoutineActivity, setNewRoutineActivity] = useState("");
  const [isAddingRoutineItem, setIsAddingRoutineItem] = useState(false);
  const [editingRoutineItem, setEditingRoutineItem] = useState<{ type: string; index: number; field: 'time' | 'activity' } | null>(null);
  const [editingRoutineValue, setEditingRoutineValue] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [lastDate, setLastDate] = useState<string>("");

  const verifySession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setIsAuthenticated(false);
        return false;
      }

      const data = await response.json();
      const authenticated = Boolean(data?.authenticated);
      setIsAuthenticated(authenticated);
      return authenticated;
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      await verifySession();
      setIsAuthLoading(false);
    };

    initializeAuth();
  }, [verifySession]);

  const handleLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmittingLogin) {
        return;
      }

      if (!loginInput.trim() || !passwordInput) {
        setLoginError("Informe login e senha.");
        return;
      }

      setLoginError(null);
      setIsSubmittingLogin(true);

      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            login: loginInput.trim(),
            senha: passwordInput,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setLoginError(data?.message ?? "Credenciais inválidas.");
          setIsAuthenticated(false);
          return;
        }

        await verifySession();
        setIsAuthLoading(false);
        setLoginInput("");
        setPasswordInput("");
        toast.success("Login realizado com sucesso!");
      } catch (error) {
        console.error("Erro ao efetuar login:", error);
        setLoginError("Não foi possível realizar o login. Tente novamente.");
      } finally {
        setIsSubmittingLogin(false);
      }
    },
    [isSubmittingLogin, loginInput, passwordInput, verifySession]
  );

  // Estados para notas rápidas
  const [quickNotes, setQuickNotes] = useState(`DE CASA
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
- 14/10 - 16:00 Fernand`);
  const [editingQuickNotes, setEditingQuickNotes] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Estados para controle financeiro
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newTransaction, setNewTransaction] = useState("");
  const [newTransactionTag, setNewTransactionTag] = useState("");
  const [newTransactionTags, setNewTransactionTags] = useState<string[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const transactionInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [expenseReportSort, setExpenseReportSort] = useState<'count' | 'total'>('count');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [isTagManuallySelected, setIsTagManuallySelected] = useState(false);
  const lastDescriptionRef = useRef<string>("");
  const [nubankFiles, setNubankFiles] = useState<File[]>([]);
  const [nubankTransactions, setNubankTransactions] = useState<NubankParsedTransaction[]>([]);
  const [nubankIsParsing, setNubankIsParsing] = useState(false);
  const [nubankError, setNubankError] = useState<string | null>(null);

  // Ajusta a altura do textarea automaticamente
  useEffect(() => {
    if (editingQuickNotes && textareaRef.current) {
      const scrollPosition = window.scrollY;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      window.scrollTo(0, scrollPosition);
    }
  }, [quickNotes, editingQuickNotes]);

  // Fechar autocomplete ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const inputContainer = document.querySelector('[data-finance-input-container]');

      if (inputContainer && !inputContainer.contains(target)) {
        setShowAutocomplete(false);
      }
    };

    if (showAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAutocomplete]);

  // Salva as notas ao clicar fora
  const handleQuickNotesBlur = async () => {
    setEditingQuickNotes(false);

    try {
      const res = await fetch('/api/quick-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: quickNotes }),
      });

      if (res.ok) {
        toast.success('Notas salvas!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
    }
  };

  // Atualização automática das notas rápidas (polling)
  useEffect(() => {
    if (!isAuthenticated || editingQuickNotes) {
      return;
    }

    const fetchQuickNotes = async () => {
      try {
        const res = await fetch('/api/quick-notes');
        const data = await res.json();

        if (data.notes && data.notes !== quickNotes) {
          // Só atualiza se o conteúdo for diferente para evitar loops
          setQuickNotes(data.notes);
        }
      } catch (error) {
        console.error('Erro ao buscar notas:', error);
      }
    };

    // Busca imediatamente quando não está editando
    fetchQuickNotes();

    // Configura polling a cada 5 segundos quando não está editando
    const interval = setInterval(fetchQuickNotes, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, editingQuickNotes, quickNotes]);

  // Ordena rotina por horário
  const sortRoutineByTime = useCallback((routine: typeof workRoutine) => {
    return [...routine].sort((a, b) => {
      // Extrai apenas o primeiro horário (antes de qualquer traço ou intervalo)
      const extractTime = (timeStr: string): number => {
        // Remove emojis e pega apenas o primeiro horário
        const cleanTime = timeStr.replace(/[^\d:]/g, '').split(/[–-]/)[0];
        const [hours, minutes = '0'] = cleanTime.split(':');
        return parseInt(hours) * 100 + parseInt(minutes);
      };

      return extractTime(a.time) - extractTime(b.time);
    });
  }, []);

  // Determina se é dia de trabalho ou folga (12x36)
  const getWorkDayType = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    // Se o dia do ano é par, é dia de trabalho; se ímpar, é folga
    return dayOfYear % 2 === 0 ? 'work' : 'off';
  };

  const workDayType = getWorkDayType();

  // Função para alternar checkbox e salvar no banco
  const toggleCheckbox = async (type: string, index: number) => {
    const key = `${type}-${index}`;
    const newCheckedItems = new Set(checkedItems);

    if (newCheckedItems.has(key)) {
      newCheckedItems.delete(key);
    } else {
      newCheckedItems.add(key);
    }

    setCheckedItems(newCheckedItems);

    // Salvar no banco de dados
    try {
      const routine = type === 'work' ? workRoutine : offRoutine;
      const updatedRoutine = routine.map((item, idx) => ({
        ...item,
        checked: newCheckedItems.has(`${type}-${idx}`)
      }));

      await fetch('/api/routine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, routine: updatedRoutine }),
      });
    } catch (error) {
      console.error('Erro ao salvar checkbox:', error);
    }
  };

  // Dados da rotina (em um caso real, viriam de um backend ou localStorage)
  const [workRoutine, setWorkRoutine] = useState([
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
  ]);

  const [offRoutine, setOffRoutine] = useState([
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
  ]);

  // Resetar checkboxes ao mudar de dia
  useEffect(() => {
    const today = new Date().toLocaleDateString('pt-BR');

    // Se mudou o dia, resetar todos os checks e salvar no banco
    if (lastDate && lastDate !== today) {
      setCheckedItems(new Set());

      // Resetar checks no banco de dados
      const resetRoutineChecks = async () => {
        try {
          // Resetar rotina de trabalho
          const workRoutineReset = workRoutine.map(item => ({ ...item, checked: false }));
          await fetch('/api/routine', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'work', routine: workRoutineReset }),
          });

          // Resetar rotina de folga
          const offRoutineReset = offRoutine.map(item => ({ ...item, checked: false }));
          await fetch('/api/routine', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'off', routine: offRoutineReset }),
          });

          // Atualizar estado local
          setWorkRoutine(workRoutineReset);
          setOffRoutine(offRoutineReset);
        } catch (error) {
          console.error('Erro ao resetar checks:', error);
        }
      };

      resetRoutineChecks();
    }

    setLastDate(today);
  }, [lastDate, workRoutine, offRoutine]);


  const handleAddRoutineItem = async (type: string) => {
    if (!newRoutineTime || !newRoutineActivity) {
      toast.error("Preencha horário e atividade!");
      return;
    }

    const newItem = { time: newRoutineTime, activity: newRoutineActivity, checked: false };
    let updatedRoutine;

    if (type === 'work') {
      updatedRoutine = sortRoutineByTime([...workRoutine, newItem]);
      setWorkRoutine(updatedRoutine);
    } else {
      updatedRoutine = sortRoutineByTime([...offRoutine, newItem]);
      setOffRoutine(updatedRoutine);
    }

    setNewRoutineTime("");
    setNewRoutineActivity("");
    setIsAddingRoutineItem(false);

    // Auto-save
    try {
      const res = await fetch('/api/routine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, routine: updatedRoutine }),
      });

      if (res.ok) {
        toast.success('Rotina salva automaticamente!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Erro ao salvar rotina:', error);
    }
  };

  const handleEditRoutineItem = (type: string, index: number) => {
    const routine = type === 'work' ? workRoutine : offRoutine;
    setEditingRoutineValue(routine[index].activity);
    setEditingRoutineItem({ type, index, field: 'activity' });
  };

  const handleSaveRoutineEdit = async (type: string, index: number, field: 'time' | 'activity') => {
    let updatedRoutine;

    if (type === 'work') {
      const newRoutine = [...workRoutine];
      newRoutine[index][field] = editingRoutineValue;
      updatedRoutine = sortRoutineByTime(newRoutine);
      setWorkRoutine(updatedRoutine);
    } else {
      const newRoutine = [...offRoutine];
      newRoutine[index][field] = editingRoutineValue;
      updatedRoutine = sortRoutineByTime(newRoutine);
      setOffRoutine(updatedRoutine);
    }

    setEditingRoutineItem(null);
    setEditingRoutineValue("");

    // Auto-save
    try {
      const res = await fetch('/api/routine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, routine: updatedRoutine }),
      });

      if (res.ok) {
        toast.success('Rotina salva automaticamente!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Erro ao salvar rotina:', error);
    }
  };

  const handleDeleteRoutineItem = async (type: string, index: number) => {
    let updatedRoutine;

    if (type === 'work') {
      updatedRoutine = workRoutine.filter((_, i) => i !== index);
      setWorkRoutine(updatedRoutine);
    } else {
      updatedRoutine = offRoutine.filter((_, i) => i !== index);
      setOffRoutine(updatedRoutine);
    }

    // Auto-save
    try {
      const res = await fetch('/api/routine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, routine: updatedRoutine }),
      });

      if (res.ok) {
        toast.success('Rotina salva automaticamente!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Erro ao salvar rotina:', error);
    }
  };

  // Carregar rotinas e notas do banco de dados ao iniciar
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadData = async () => {
      try {
        // Carregar rotinas
        const routineRes = await fetch('/api/routine');
        const routineData = await routineRes.json();

        if (routineData.work && Array.isArray(routineData.work)) {
          const sortedWork = sortRoutineByTime(routineData.work);
          setWorkRoutine(sortedWork);

          // Carregar checkboxes da rotina de trabalho
          const workChecked = new Set<string>();
          sortedWork.forEach((item: { time: string; activity: string; checked?: boolean }, idx: number) => {
            if (item.checked) {
              workChecked.add(`work-${idx}`);
            }
          });
          setCheckedItems(prev => new Set([...prev, ...workChecked]));
        }

        if (routineData.off && Array.isArray(routineData.off)) {
          const sortedOff = sortRoutineByTime(routineData.off);
          setOffRoutine(sortedOff);

          // Carregar checkboxes da rotina de folga
          const offChecked = new Set<string>();
          sortedOff.forEach((item: { time: string; activity: string; checked?: boolean }, idx: number) => {
            if (item.checked) {
              offChecked.add(`off-${idx}`);
            }
          });
          setCheckedItems(prev => new Set([...prev, ...offChecked]));
        }

        // Carregar notas rápidas
        const notesRes = await fetch('/api/quick-notes');
        const notesData = await notesRes.json();

        if (notesData.notes) {
          setQuickNotes(notesData.notes);
        }

        // Carregar transações
        const transactionsRes = await fetch('/api/transactions');
        const transactionsData = await transactionsRes.json();

        if (transactionsData.transactions) {
          const normalized = transactionsData.transactions.map(
            (t: Transaction & { payment_method?: string }) => ({
              ...t,
              paymentMethod: t.paymentMethod ?? t.payment_method ?? 'credit',
            })
          );
          setTransactions(normalized);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };

    loadData();
  }, [isAuthenticated, sortRoutineByTime]);

  // Funções para controle financeiro
  const handleTransactionInput = async (value: string, cursorPosition?: number | null) => {
    setNewTransaction(value);
    setSelectedSuggestionIndex(-1);

    const hasPipe = value.includes('|');
    const pipeIndex = hasPipe ? value.indexOf('|') : -1;
    const resolvedCursor = cursorPosition ?? transactionInputRef.current?.selectionStart ?? null;

    const descriptionPart = value.split('|')[0].trim();
    const normalizedDescription = normalizeText(descriptionPart);
    const shouldResetManual =
      normalizedDescription !== lastDescriptionRef.current ||
      (normalizedDescription === '' && lastDescriptionRef.current !== '');
    if (shouldResetManual) {
      lastDescriptionRef.current = normalizedDescription;
      setIsTagManuallySelected(false);
    }

    if (!isTagManuallySelected && descriptionPart) {
      const inferredTags = inferTagsFromDescription(descriptionPart, knownTagMap);
      if (inferredTags.length > 0) {
        setNewTransactionTags(inferredTags);
        setNewTransactionTag(inferredTags[0]);
      } else if (descriptionPart.trim()) {
        setNewTransactionTags(['desconhecido']);
        setNewTransactionTag('desconhecido');
      } else {
        setNewTransactionTags([]);
        setNewTransactionTag("");
      }
    }

    // Se o cursor estiver após o "|", não exibe recomendações
    if (hasPipe && resolvedCursor !== null && resolvedCursor > pipeIndex) {
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
      return;
    }

    // Buscar sugestões de autocomplete
    // Busca quando há pelo menos 2 caracteres antes do "|" ou se não há "|" ainda
    if (value.length >= 2) {
      const description = hasPipe ? value.split('|')[0] : value;

      if (description.trim().length >= 2) {
        try {
          const res = await fetch(`/api/transactions/autocomplete?q=${encodeURIComponent(description.trim())}`);
          const data = await res.json();
          setAutocompleteSuggestions(data.suggestions || []);
          setShowAutocomplete(data.suggestions && data.suggestions.length > 0);
        } catch (error) {
          console.error('Erro ao buscar sugestões:', error);
          setShowAutocomplete(false);
          setAutocompleteSuggestions([]);
        }
      } else {
        setShowAutocomplete(false);
        setAutocompleteSuggestions([]);
      }
    } else {
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const currentValue = newTransaction;
    const hasPipe = currentValue.includes('|');
    const [, amount] = currentValue.split('|');

    // Se já tem "|", mantém o valor após o "|", senão adiciona "|"
    const newValue = hasPipe
      ? suggestion + '|' + (amount || '')
      : suggestion + '|';

    setNewTransaction(newValue);
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setIsTagManuallySelected(false);
    const inferredTags = inferTagsFromDescription(suggestion, knownTagMap);
    if (inferredTags.length > 0) {
      setNewTransactionTags(inferredTags);
      setNewTransactionTag(inferredTags[0]);
    } else {
      setNewTransactionTags(['desconhecido']);
      setNewTransactionTag('desconhecido');
    }

    // Foca no input e move o cursor para depois do "|"
    setTimeout(() => {
      transactionInputRef.current?.focus();
      if (transactionInputRef.current) {
        const cursorPos = newValue.indexOf('|') + 1;
        transactionInputRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.trim()) {
      toast.error("Preencha a transação!");
      return;
    }

    const tagsToSave = newTransactionTags.length > 0
      ? newTransactionTags
      : (newTransactionTag.trim() ? [newTransactionTag.trim()] : []);

    if (tagsToSave.length === 0) {
      toast.error("Selecione uma tag!");
      return;
    }

    // Parse do formato: "descrição|valor" ou "descrição|valor|debito"
    const parts = newTransaction.split('|');
    if (parts.length < 2) {
      toast.error("Formato inválido! Use: descricao|valor ou descricao|valor|debito");
      return;
    }

    const description = parts[0].trim();
    let amountStr = parts[1].trim();
    const methodStr = (parts[2] || '').trim();

    // Normaliza "debito" removendo acentos e convertendo para lowercase
    const normalizeDebito = (str: string) => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .trim();
    };

    const normalizedMethod = normalizeDebito(methodStr);
    const isDebito = normalizedMethod === 'debito' || normalizedMethod === 'debit';

    // Verifica se tem sinal explícito
    const isNegative = amountStr.startsWith('-');
    const hasPositiveSign = amountStr.startsWith('+');

    // Remove o sinal para fazer o parse
    if (isNegative || hasPositiveSign) {
      amountStr = amountStr.substring(1).trim();
    }

    // Converte vírgula para ponto
    const amount = parseFloat(amountStr.replace(',', '.'));

    if (isNaN(amount) || amount === 0) {
      toast.error("Valor inválido!");
      return;
    }

    // Verifica se é pagamento de fatura (aceita variações com/sem acento)
    const descLower = description.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
    const isInvoicePayment = (descLower.includes('pagamento') || descLower.includes('pagar')) &&
      (descLower.includes('fatura') || descLower.includes('fatur')) &&
      (descLower.includes('cartao') || descLower.includes('credito'));

    // Determina o tipo e método de pagamento
    let type: 'income' | 'expense' | 'invoice_payment';
    let paymentMethod: 'credit' | 'debit';

    if (isInvoicePayment) {
      type = 'invoice_payment';
      paymentMethod = 'credit'; // Faturas são sempre crédito
    } else if (hasPositiveSign) {
      // Entrada sempre é débito
      type = 'income';
      paymentMethod = 'debit';
    } else {
      // Saída: verifica se foi especificado débito, senão assume crédito
      type = 'expense';
      paymentMethod = isDebito ? 'debit' : 'credit';
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: Math.abs(amount),
          type,
          paymentMethod,
          tags: tagsToSave
        }),
      });

      if (res.ok) {
        const newTransactionData = await res.json();
        const normalized = {
          ...newTransactionData,
          paymentMethod: newTransactionData.paymentMethod ?? newTransactionData.payment_method ?? paymentMethod,
        };
        setTransactions([normalized as Transaction, ...transactions]);
        setNewTransaction("");
        setNewTransactionTag("");
        setNewTransactionTags([]);
        setIsTagManuallySelected(false);
        lastDescriptionRef.current = "";
        setShowAutocomplete(false);
        setAutocompleteSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setCurrentPage(1); // Volta para primeira página ao adicionar nova transação
        toast.success('Transação adicionada!', { duration: 2000 });
      } else {
        toast.error('Erro ao adicionar transação!');
      }
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      toast.error('Erro ao adicionar transação!');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const updatedTransactions = transactions.filter(t => t.id !== id);
        setTransactions(updatedTransactions);
        // Ajusta a página se necessário após deletar
        const totalPages = Math.ceil(updatedTransactions.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
        }
        toast.success('Transação removida!', { duration: 2000 });
      } else {
        toast.error('Erro ao remover transação!');
      }
    } catch (error) {
      console.error('Erro ao remover transação:', error);
      toast.error('Erro ao remover transação!');
    }
  };

  const handleUpdateTransactionTags = async (id: string, nextTag: string) => {
    const trimmedTag = nextTag.trim();
    const tagsPayload = trimmedTag ? [trimmedTag] : [];

    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags: tagsPayload })
      });

      if (res.ok) {
        const updated = await res.json();
        setTransactions(prev =>
          prev.map((transaction) =>
            transaction.id === id
              ? { ...transaction, tags: updated.tags ?? tagsPayload }
              : transaction
          )
        );
        toast.success('Tag atualizada!', { duration: 2000 });
      } else {
        toast.error('Erro ao atualizar tag!');
      }
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
      toast.error('Erro ao atualizar tag!');
    } finally {
      setEditingTagId(null);
    }
  };

  const handleNubankFilesSelected = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const fileArray = Array.from(files).filter((file) => file.type === 'application/pdf');
    if (fileArray.length === 0) {
      setNubankError('Selecione arquivos PDF da Nubank.');
      return;
    }

    setNubankFiles(fileArray);
    setNubankError(null);
  };

  const handleParseNubankInvoices = async () => {
    if (nubankFiles.length === 0) {
      setNubankError('Adicione ao menos um PDF da Nubank.');
      return;
    }

    setNubankIsParsing(true);
    setNubankError(null);

    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const workerVersion = pdfjs.version || '4.0.379';
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.js`;

      const parsedTransactions: NubankParsedTransaction[] = [];

      for (const file of nubankFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let textContent = '';

        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          const page = await pdf.getPage(pageIndex);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: { str: string }) => item.str)
            .join('\n');
          textContent += `${pageText}\n`;
        }

        const parsed = parseNubankTransactionsFromText(textContent, file.name, knownTagMap);
        parsedTransactions.push(...parsed);
      }

      setNubankTransactions(parsedTransactions);
    } catch (error) {
      console.error('Erro ao ler fatura Nubank:', error);
      setNubankError('Não foi possível ler o PDF. Verifique o arquivo e tente novamente.');
    } finally {
      setNubankIsParsing(false);
    }
  };

  const handleClearNubank = () => {
    setNubankFiles([]);
    setNubankTransactions([]);
    setNubankError(null);
  };

  // Função para extrair multiplicador da descrição (ex: "BHx3" -> 3, "Valorant x3" -> 3)
  const getMultiplierFromDescription = (description: string): number => {
    const match = description.match(/\s*x\s*(\d+)$/i);
    return match ? parseInt(match[1], 10) : 1;
  };

  // Calcular totais
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => {
      const multiplier = getMultiplierFromDescription(t.description);
      return sum + (t.amount * multiplier);
    }, 0);

  const totalExpenseWithoutMultiplier = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenseCredit = transactions
    .filter(t => t.type === 'expense' && (t.paymentMethod ?? 'credit') === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInvoicePayments = transactions
    .filter(t => t.type === 'invoice_payment')
    .reduce((sum, t) => sum + t.amount, 0);

  // Novo valor de Saídas Crédito (crédito - faturas pagas)
  const totalExpenseCreditNet = Math.max(0, totalExpenseCredit - totalInvoicePayments);

  const tagOptions = useMemo(() => {
    const tagsMap = new Map<string, string>();
    DEFAULT_TAG_OPTIONS.forEach((tag) => {
      tagsMap.set(normalizeText(tag), tag);
    });
    transactions.forEach((transaction) => {
      parseTags(transaction.tags).forEach((tag) => {
        const trimmed = tag.trim();
        if (!trimmed) {
          return;
        }
        const normalized = normalizeText(trimmed);
        if (!normalized) {
          return;
        }
        if (normalized !== 'uber to aiko' && !tagsMap.has(normalized)) {
          tagsMap.set(normalized, trimmed);
        }
      });
    });

    return Array.from(tagsMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [transactions]);

  const tagOptionsMap = useMemo(() => {
    const map = new Map<string, string>();
    tagOptions.forEach((tag) => {
      map.set(normalizeText(tag), tag);
    });
    return map;
  }, [tagOptions]);

  const knownTagMap = useMemo(() => {
    const map = new Map<string, string[]>();
    transactions.forEach((transaction) => {
      const normalizedDescription = normalizeText(stripMultiplierSuffix(transaction.description));
      if (!normalizedDescription) {
        return;
      }
      const tags = parseTags(transaction.tags);
      if (tags.length > 0) {
        map.set(normalizedDescription, tags);
      }
    });
    return map;
  }, [transactions]);

  const nubankSummary = useMemo(() => {
    if (nubankTransactions.length === 0) {
      return { total: 0, count: 0, positive: 0, negative: 0 };
    }

    return nubankTransactions.reduce(
      (acc, transaction) => {
        acc.total += transaction.amount;
        acc.count += 1;
        if (transaction.amount >= 0) {
          acc.positive += transaction.amount;
        } else {
          acc.negative += transaction.amount;
        }
        return acc;
      },
      { total: 0, count: 0, positive: 0, negative: 0 }
    );
  }, [nubankTransactions]);

  const expenseReportByMonth = useMemo<ExpenseMonthReport[]>(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) {
      return [];
    }

    const monthMap = new Map<string, { key: string; label: string; expenses: Transaction[] }>();

    expenses.forEach((transaction) => {
      const { key, label } = getMonthKey(transaction.created_at);
      const existingMonth = monthMap.get(key);
      if (existingMonth) {
        existingMonth.expenses.push(transaction);
      } else {
        monthMap.set(key, { key, label, expenses: [transaction] });
      }
    });

    const months = Array.from(monthMap.values()).map((month) => {
      const groupsMap = new Map<string, ExpenseGroup>();
      const tagStats = new Map<string, { label: string; total: number; count: number; items: Map<string, number> }>();
      let monthTotal = 0;

      month.expenses.forEach((transaction) => {
        const multiplier = getMultiplierFromDescription(transaction.description);
        const effectiveAmount = transaction.amount * multiplier;
        monthTotal += effectiveAmount;

        const cleanedName = stripMultiplierSuffix(transaction.description);
        const displayName = cleanedName || transaction.description || 'Sem descricao';
        const normalizedName = normalizeText(cleanedName || transaction.description);
        const groupKey = normalizedName || normalizeText(displayName) || 'sem-descricao';

        const existingGroup = groupsMap.get(groupKey);
        const nextItem: ExpenseReportItem = {
          ...transaction,
          multiplier,
          effectiveAmount
        };

        if (existingGroup) {
          existingGroup.total += effectiveAmount;
          existingGroup.count += 1;
          existingGroup.items.push(nextItem);
        } else {
          groupsMap.set(groupKey, {
            key: groupKey,
            name: displayName,
            total: effectiveAmount,
            count: 1,
            items: [nextItem]
          });
        }

        const parsedTags = parseTags(transaction.tags);
        parsedTags.forEach((tag) => {
          const trimmedTag = tag.trim();
          if (!trimmedTag) {
            return;
          }
          const normalizedTag = normalizeText(trimmedTag);
          if (!normalizedTag) {
            return;
          }

          const existing = tagStats.get(normalizedTag) ?? {
            label: trimmedTag,
            total: 0,
            count: 0,
            items: new Map<string, number>()
          };

          existing.total += effectiveAmount;
          existing.count += 1;
          const currentCount = existing.items.get(displayName) ?? 0;
          existing.items.set(displayName, currentCount + 1);
          tagStats.set(normalizedTag, existing);
        });
      });

      const groups = Array.from(groupsMap.values()).map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        })
      }));

      const groupCards = groups.map((group) => ({
        id: `group-${group.key}`,
        label: group.name,
        total: group.total,
        count: group.count,
        hint: 'Agrupamento real',
        items: limitTooltipItems(buildGroupTooltipItems(group.items))
      }));

      const topGroupsByCount = [...groupCards]
        .sort((a, b) => b.count - a.count || b.total - a.total || a.label.localeCompare(b.label))
        .slice(0, MAX_CARD_ITEMS);

      const topGroupsByValue = [...groupCards]
        .sort((a, b) => b.total - a.total || b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, MAX_CARD_ITEMS);

      const categoryCards = Array.from(tagStats.entries())
        .map(([normalizedTag, data]) => ({
          id: `tag-${normalizedTag}`,
          label: formatTagLabel(data.label),
          total: data.total,
          count: data.count,
          hint: `Tag: ${data.label}`,
          items: limitTooltipItems(buildCategoryTooltipItems(data.items))
        }));

      return {
        key: month.key,
        label: month.label,
        total: monthTotal,
        count: month.expenses.length,
        topGroupsByCount,
        topGroupsByValue,
        categoryCards,
        groups
      };
    });

    return months.sort((a, b) => {
      if (a.key === 'sem-data') {
        return 1;
      }
      if (b.key === 'sem-data') {
        return -1;
      }
      return b.key.localeCompare(a.key);
    });
  }, [transactions]);

  const sortExpenseGroups = (groups: ExpenseGroup[]) => {
    return [...groups].sort((a, b) => {
      if (expenseReportSort === 'count') {
        return b.count - a.count || b.total - a.total || a.name.localeCompare(b.name);
      }
      return b.total - a.total || b.count - a.count || a.name.localeCompare(b.name);
    });
  };

  const getTaskStatus = (startDate: string | number | Date, endDate: string | number | Date) => {
    const now = new Date();

    // Valida se as datas são válidas
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        color: "#6b7280", // cinza
        bgColor: "#f9fafb", // fundo cinza claro
        borderColor: "#d1d5db", // borda cinza
        status: "invalid",
        icon: FaExclamationTriangle,
        label: "DATA INVÁLIDA",
        daysText: "Data inválida",
        isOverdue: false
      };
    }

    // Converte datas para strings no formato YYYY-MM-DD para comparação
    const todayStr = now.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // Cria data de fim ajustada para 23:59:59 do dia final
    end.setHours(23, 59, 59, 999);

    // Calcula diferença em dias usando a data de fim ajustada
    const daysToEnd = differenceInDays(end, now);
    const hoursToEnd = differenceInHours(end, now);

    // Tarefa vencida - só considera vencida se passou do dia final
    if (todayStr > endDateStr) {
      return {
        color: "#7f1d1d", // vermelho bem escuro
        bgColor: "#1f1f1f", // fundo escuro
        borderColor: "#7f1d1d", // borda vermelha escura
        status: "overdue",
        icon: FaExclamationTriangle,
        label: "VENCIDA",
        daysText: "Vencida",
        isOverdue: true
      };
    }

    // Caso a data de início ainda não tenha chegado
    if (isBefore(now, start)) {
      return {
        color: "#6b7280", // cinza
        bgColor: "#f9fafb", // fundo cinza claro
        borderColor: "#d1d5db", // borda cinza
        status: "upcoming",
        icon: FaCalendarAlt,
        label: "EM BREVE",
        daysText: `${differenceInDays(start, now)} dias para começar`
      };
    }

    // Tarefa em andamento - sistema de cores baseado em dias restantes
    if (daysToEnd <= 5) {
      let daysText = "";
      if (daysToEnd === 0) {
        // Se é hoje, mostra as horas restantes
        if (hoursToEnd > 0) {
          daysText = `${hoursToEnd}h restantes`;
        } else {
          daysText = "Hoje!";
        }
      } else {
        daysText = `${daysToEnd} dias restantes`;
      }

      return {
        color: "#dc2626", // vermelho
        bgColor: "#fef2f2", // fundo vermelho claro
        borderColor: "#fca5a5", // borda vermelha
        status: "urgent",
        icon: FaExclamationTriangle,
        label: "URGENTE",
        daysText: daysText
      };
    } else if (daysToEnd <= 10) {
      return {
        color: "#ea580c", // laranja
        bgColor: "#fff7ed", // fundo laranja claro
        borderColor: "#fed7aa", // borda laranja
        status: "warning",
        icon: FaClock,
        label: "ATENÇÃO",
        daysText: `${daysToEnd} dias restantes`
      };
    } else if (daysToEnd <= 20) {
      return {
        color: "#2563eb", // azul
        bgColor: "#eff6ff", // fundo azul claro
        borderColor: "#93c5fd", // borda azul
        status: "normal",
        icon: FaCheckCircle,
        label: "EM ANDAMENTO",
        daysText: `${daysToEnd} dias restantes`
      };
    } else {
      return {
        color: "#16a34a", // verde
        bgColor: "#f0fdf4", // fundo verde claro
        borderColor: "#86efac", // borda verde
        status: "safe",
        icon: FaCheckCircle,
        label: "NO PRAZO",
        daysText: `${daysToEnd} dias restantes`
      };
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTopics(data);
        setEditedTopics(JSON.parse(JSON.stringify(data)));
      })
      .catch((err) => console.error("Erro ao buscar tarefas:", err));
  }, [isAuthenticated]);

  useEffect(() => {
    if (editedTopics.length > 0 && visibleSections.length === 0) {
      // Seção "Faculdade" sempre aberta, outras fechadas
      const initialVisibility = editedTopics.map(section =>
        section.section.toLowerCase().includes('faculdade1') ||
        section.section.toLowerCase().includes('tarefas1')
      );
      setVisibleSections(initialVisibility);
    }
  }, [editedTopics, visibleSections.length]);


  const handleEditChange = (
    sectionIndex: number,
    topicIndex: number,
    taskIndex: number | null,
    field: string,
    value: string
  ) => {
    const updatedSections = [...editedTopics];

    if (taskIndex === null) {
      updatedSections[sectionIndex].sectionitens[topicIndex].topic = value;

    } else {
      updatedSections[sectionIndex].sectionitens[topicIndex].tasks[taskIndex][field as keyof Task] = value;

    }

    setEditedTopics(updatedSections);
  };


  const handleSave = async () => {
    try {
      // Primeiro, salva as edições das tarefas
      const editRes = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedTopics),
      });

      if (!editRes.ok) throw new Error(`Erro HTTP! Status: ${editRes.status}`);

      // Agora, processa todas as deleções pendentes
      for (const deletion of pendingDeletions) {
        const deleteRes = await fetch("/api/tasks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deletion),
        });

        if (!deleteRes.ok) throw new Error(`Erro ao deletar! Status: ${deleteRes.status}`);
      }

      // Salva as rotinas
      const routineRes = await fetch("/api/routine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work: workRoutine,
          off: offRoutine
        }),
      });

      if (!routineRes.ok) throw new Error(`Erro ao salvar rotinas! Status: ${routineRes.status}`);

      // Salva as notas rápidas
      const notesRes = await fetch("/api/quick-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: quickNotes }),
      });

      if (!notesRes.ok) throw new Error(`Erro ao salvar notas! Status: ${notesRes.status}`);

      // Atualiza o estado com os dados editados e limpa a lista de deleções
      setTopics(editedTopics);
      setPendingDeletions([]);

      toast.success("Alterações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar mudanças:", error);
      toast.error("Erro ao salvar alterações!");
    }
  };

  const toggleVisibility = (index: number) => {
    setVisibleSections((prev) => {
      const newVisibility = [...prev];
      newVisibility[index] = !newVisibility[index];
      return newVisibility;
    });
  };

  const handleAddNewTask = async () => {
    if (!newTopic || !selectedSection) {
      toast.error("Todos os campos devem ser preenchidos.");
      return;
    }

    const newTask = {
      name: newTaskName,
      startDate: newStartDate,
      endDate: newEndDate,
    };

    const sectionExists = topics.find((section) => section.section === newTopic);

    if (sectionExists) {
      const topicExists = sectionExists.sectionitens.find((topic) => topic.topic === newTopic);

      if (topicExists) {
        // Adiciona a nova tarefa ao tópico existente
        topicExists.tasks.push(newTask);
      } else {
        // Adiciona um novo tópico com a nova tarefa
        sectionExists.sectionitens.push({ topic: newTopic, tasks: [newTask] });
      }
    } else {
      // Cria uma nova seção com o novo tópico e a nova tarefa
      setTopics([
        ...topics,
        { section: newTopic, sectionitens: [{ topic: newTopic, tasks: [newTask] }] },
      ]);
    }

    setNewTopic("");
    setNewTaskName("");
    setNewStartDate("");
    setNewEndDate("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: selectedSection, topic: newTopic, task: newTask }),
      });

      if (!res.ok) throw new Error(`Erro HTTP! Status: ${res.status}`);

      toast.success("Novo tópico e tarefa adicionados com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
    }
  };


  const toggleAddNewTask = (topic: number) => {
    setAddingTaskIndex(topic)
    setIsEdited(true)
  }

  const toggleCancelNewTask = () => {
    setAddingTaskIndex(null)
    setIsEdited(false)
  }


  const handleAddTaskToTopic = async (sectionIndex: number, topicIndex: number) => {
    setIsEdited(false);
    const updatedSections = [...editedTopics];

    const newTask = {
      name: newTaskName,
      startDate: newStartDate,
      endDate: newEndDate,
    };

    // Adiciona a nova tarefa ao tópico dentro da seção
    updatedSections[sectionIndex].sectionitens[topicIndex].tasks.push(newTask);
    setEditedTopics(updatedSections);

    // Limpa os campos de nova tarefa
    setNewTaskName("");
    setNewStartDate("");
    setNewEndDate("");
    setAddingTaskIndex(null);

    // Faz a requisição à API para salvar a nova tarefa
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: updatedSections[sectionIndex].section,
          topic: updatedSections[sectionIndex].sectionitens[topicIndex].topic,
          task: newTask,
        }),
      });

      if (!res.ok) throw new Error(`Erro HTTP! Status: ${res.status}`);

      toast.success("Tarefa adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
    }
  };

  const markTaskForDeletion = (sectionIndex: number, topicIndex: number, taskIndex: number) => {
    const updatedSections = [...editedTopics];
    const section = updatedSections[sectionIndex];
    const topic = section.sectionitens[topicIndex];
    const task = topic.tasks[taskIndex].name;

    // Remove a tarefa apenas do estado local
    topic.tasks.splice(taskIndex, 1);
    setEditedTopics(updatedSections);

    // Adiciona a tarefa na lista de deleções pendentes
    setPendingDeletions([...pendingDeletions, { section: section.section, topic: topic.topic, task }]);
  };

  const markTopicForDeletion = (sectionIndex: number, topicIndex: number) => {
    const updatedSections = [...editedTopics];
    const section = updatedSections[sectionIndex];
    const topic = section.sectionitens[topicIndex].topic;

    // Remove o tópico apenas do estado local
    section.sectionitens.splice(topicIndex, 1);
    setEditedTopics(updatedSections);

    // Adiciona o tópico na lista de deleções pendentes
    setPendingDeletions([...pendingDeletions, { section: section.section, topic }]);
  };

  const toastElement = (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#4ade80',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );

  if (isAuthLoading) {
    return (
      <AuthContainer>
        {toastElement}
        <AuthCard>
          <AuthTitle>Verificando sessão...</AuthTitle>
          <AuthSubtitle>Aguarde um instante enquanto confirmamos suas credenciais.</AuthSubtitle>
        </AuthCard>
      </AuthContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthContainer>
        {toastElement}
        <AuthCard>
          <AuthTitle>Bem-vindo</AuthTitle>
          <AuthSubtitle>Acesse para visualizar suas rotinas e tarefas.</AuthSubtitle>
          <AuthForm onSubmit={handleLogin}>
            <AuthInput
              type="text"
              placeholder="Usuário"
              value={loginInput}
              onChange={(event) => setLoginInput(event.target.value)}
              autoComplete="username"
              disabled={isSubmittingLogin}
            />
            <AuthInput
              type="password"
              placeholder="Senha"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              autoComplete="current-password"
              disabled={isSubmittingLogin}
            />
            {loginError && <AuthError>{loginError}</AuthError>}
            <AuthButton type="submit" disabled={isSubmittingLogin}>
              {isSubmittingLogin ? "Entrando..." : "Entrar"}
            </AuthButton>
          </AuthForm>
        </AuthCard>
      </AuthContainer>
    );
  }

  return (
    <Container>
      {toastElement}
      <Header>
        <Title className="flex items-center gap-4"><FaTasks size={30} /> <span>Manage Tasks</span></Title>
      </Header>
      <Line />

      {/* Seção de Tarefas Prioritárias */}
      <PrioritySection>
        <PriorityHeader>
          <PriorityTitle>🚨 Tarefas Prioritárias</PriorityTitle>
        </PriorityHeader>

        <PriorityTasks>
          {editedTopics.map((sectionData, sectionIndex) =>
            sectionData.sectionitens.map((topicData, topicIndex) =>
              topicData.tasks
                .map((task, taskIndex) => {
                  const taskStatus = getTaskStatus(task.startDate, task.endDate);
                  const isPriority = taskStatus.status === 'urgent' ||
                    taskStatus.status === 'overdue' ||
                    taskStatus.status === 'warning';

                  if (!isPriority) return null;

                  const StatusIcon = taskStatus.icon;
                  const isUrgent = taskStatus.status === 'urgent' || taskStatus.status === 'overdue';

                  return (
                    <PriorityCard key={`${sectionIndex}-${topicIndex}-${taskIndex}`} $taskStatus={taskStatus} $isUrgent={isUrgent}>
                      <PriorityCardContent>
                        <PrioritySectionInfo>
                          <PrioritySectionName>{sectionData.section}</PrioritySectionName>
                          <PriorityTopicName>{topicData.topic}</PriorityTopicName>
                        </PrioritySectionInfo>

                        <PriorityTaskInfo>
                          <PriorityTaskTitle>{task.name}</PriorityTaskTitle>
                          <PriorityTaskDates>
                            <span><strong>Início:</strong> {task.startDate}</span>
                            <span><strong>Vencimento:</strong> {task.endDate}</span>
                          </PriorityTaskDates>
                        </PriorityTaskInfo>
                      </PriorityCardContent>

                      <PriorityTaskStatus>
                        <StatusBadge $taskStatus={taskStatus}>
                          <StatusIcon />
                          <span>{taskStatus.label}</span>
                        </StatusBadge>
                        <DaysCounter $taskStatus={taskStatus}>
                          {taskStatus.daysText}
                        </DaysCounter>
                      </PriorityTaskStatus>
                    </PriorityCard>
                  );
                })
                .filter(Boolean)
            )
          ).flat()}

          {editedTopics.map((sectionData) =>
            sectionData.sectionitens.map((topicData) =>
              topicData.tasks
                .map((task) => {
                  const taskStatus = getTaskStatus(task.startDate, task.endDate);
                  const isPriority = taskStatus.status === 'urgent' ||
                    taskStatus.status === 'overdue' ||
                    taskStatus.status === 'warning';
                  return isPriority;
                })
                .some(Boolean)
            )
          ).flat().some(Boolean) ? null : (
            <NoPriorityTasks>
              <span>🎉 Nenhuma tarefa prioritária no momento!</span>
              <span>Todas as suas tarefas estão no prazo.</span>
            </NoPriorityTasks>
          )}
        </PriorityTasks>
      </PrioritySection>

      <Line />

      {/* Seção de Notas Rápidas */}
      <QuickNotesSection>
        <QuickNotesHeader>
          <QuickNotesTitle>📝 Notas Rápidas</QuickNotesTitle>
          <QuickNotesSubtitle>Suas anotações do WhatsApp</QuickNotesSubtitle>
        </QuickNotesHeader>

        <QuickNotesContent>
          {editingQuickNotes ? (
            <QuickNotesTextarea
              ref={textareaRef}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              onBlur={handleQuickNotesBlur}
              autoFocus
              spellCheck={false}
            />
          ) : (
            <QuickNotesDisplay onClick={() => setEditingQuickNotes(true)}>
              {quickNotes.split('\n').map((line, index) => (
                <div key={index}>{line || ' '}</div>
              ))}
            </QuickNotesDisplay>
          )}
        </QuickNotesContent>
      </QuickNotesSection>

      <Line />

      {/* Seção de Controle Financeiro */}
      <FinanceSection>
        <FinanceHeader>
          <FinanceTitle>💰 Controle Financeiro</FinanceTitle>
          <FinanceSubtitle>Gerencie suas entradas e saídas</FinanceSubtitle>
        </FinanceHeader>

        {/* Cards de Resumo */}
        <FinanceCards>
          <FinanceCard $type="expense">
            <FinanceCardIcon $color="expense">
              <MdArrowDownward />
            </FinanceCardIcon>
            <FinanceCardContent>
              <FinanceCardLabel>Saídas Totais</FinanceCardLabel>
              <FinanceCardHint>Todos os lançamentos de saída, crédito e debito.</FinanceCardHint>
              <FinanceCardValue>
                R$ {totalExpense.toFixed(2).replace('.', ',')}
                {totalExpense !== totalExpenseWithoutMultiplier && (
                  <>

                    <FinanceCardSecondaryValue>
                      {'| '}{totalExpenseWithoutMultiplier.toFixed(2).replace('.', ',')}
                    </FinanceCardSecondaryValue>
                  </>
                )}
              </FinanceCardValue>
            </FinanceCardContent>
          </FinanceCard>

          <FinanceCard $type="income">
            <FinanceCardIcon $color="income">
              <MdArrowUpward />
            </FinanceCardIcon>
            <FinanceCardContent>
              <FinanceCardLabel>Total de Entradas</FinanceCardLabel>
              <FinanceCardHint>Total de recebimentos</FinanceCardHint>
              <FinanceCardValue>
                R$ {totalIncome.toFixed(2).replace('.', ',')}
              </FinanceCardValue>
            </FinanceCardContent>
          </FinanceCard>

          <FinanceCard $type="expense">
            <FinanceCardIcon $color="credit">
              <MdCreditCard />
            </FinanceCardIcon>
            <FinanceCardContent>
              <FinanceCardLabel>Saídas Crédito</FinanceCardLabel>
              <FinanceCardHint>A pagar até 05 do próximo mês.</FinanceCardHint>
              <FinanceCardValue>
                R$ {totalExpenseCreditNet.toFixed(2).replace('.', ',')}
                {totalExpenseCreditNet !== totalExpenseCredit && (
                  <>
                    {' | '}
                    <FinanceCardSecondaryValue>
                      {totalExpenseCredit.toFixed(2).replace('.', ',')}
                    </FinanceCardSecondaryValue>
                  </>
                )}
              </FinanceCardValue>
            </FinanceCardContent>
          </FinanceCard>

          {totalInvoicePayments > 0 && (
            <FinanceCard $type="expense">
              <FinanceCardIcon $color="invoice">
                <MdCreditCard />
              </FinanceCardIcon>
              <FinanceCardContent>
                <FinanceCardLabel>Faturas Pagas</FinanceCardLabel>
                <FinanceCardHint>Total de faturas de cartão pagas</FinanceCardHint>
                <FinanceCardValue>
                  R$ {totalInvoicePayments.toFixed(2).replace('.', ',')}
                </FinanceCardValue>
              </FinanceCardContent>
            </FinanceCard>
          )}
        </FinanceCards>

        {/* Formulário de Inserção */}
        <FinanceForm>
          <FinanceInputContainer data-finance-input-container>
            <FinanceInput
              ref={transactionInputRef}
              type="text"
              placeholder="Ex: uber|-33,23 ou Salario|+2759,00"
              value={newTransaction}
              onChange={(e) => handleTransactionInput(e.target.value, e.target.selectionStart)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (showAutocomplete && selectedSuggestionIndex >= 0 && autocompleteSuggestions[selectedSuggestionIndex]) {
                    handleSelectSuggestion(autocompleteSuggestions[selectedSuggestionIndex]);
                  } else {
                    handleAddTransaction();
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev =>
                    prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                } else if (e.key === 'Escape') {
                  setShowAutocomplete(false);
                  setSelectedSuggestionIndex(-1);
                }
              }}
              onFocus={() => {
                if (autocompleteSuggestions.length > 0) {
                  setShowAutocomplete(true);
                }
              }}
            />
            {showAutocomplete && autocompleteSuggestions.length > 0 && (
              <AutocompleteDropdown>
                {autocompleteSuggestions.map((suggestion, index) => (
                  <AutocompleteItem
                    key={index}
                    $isSelected={index === selectedSuggestionIndex}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    {suggestion}
                  </AutocompleteItem>
                ))}
              </AutocompleteDropdown>
            )}
          </FinanceInputContainer>
          <FinanceTagContainer>
            <FinanceTagSelect
              value={newTransactionTag}
              onChange={(event) => {
                const selectedTag = event.target.value;
                setNewTransactionTag(selectedTag);
                setNewTransactionTags(selectedTag ? [selectedTag] : []);
                setIsTagManuallySelected(true);
              }}
            >
              <option value="">Selecione</option>
              {tagOptions.map((tagOption) => (
                <option key={tagOption} value={tagOption}>
                  {formatTagLabel(tagOption)}
                </option>
              ))}
            </FinanceTagSelect>
          </FinanceTagContainer>
          <FinanceButton onClick={handleAddTransaction}>
            Adicionar
          </FinanceButton>
        </FinanceForm>

        {/* Lista de Transações */}
        {(() => {
          const totalPages = Math.ceil(transactions.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedTransactions = transactions.slice(startIndex, endIndex);

          return (
            <>
              <TransactionsList>
                {transactions.length === 0 ? (
                  <NoTransactions>
                    <span>Nenhuma transação registrada ainda</span>
                    <span>Adicione uma transação usando o formato: descrição|valor</span>
                  </NoTransactions>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <TransactionItem key={transaction.id} $type={transaction.type}>
                      <TransactionInfo >
                        <div className="flex flex-row gap-2 justify-between">
                          <TransactionDescription>{transaction.description}</TransactionDescription>
                          <PaymentTag $method={(transaction.paymentMethod ?? 'credit')}>
                            {(transaction.paymentMethod ?? 'credit') === 'debit' ? 'Débito' : 'Crédito'}
                          </PaymentTag>
                        </div>
                        <div className="flex flex-row gap-2 justify-between">
                          <TransactionDate>
                            {transaction.created_at
                              ? new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : ''}
                          </TransactionDate>
                          <TransactionAmount $type={transaction.type}>
                            {transaction.type === 'income'
                              ? '+'
                              : transaction.type === 'invoice_payment'
                                ? '✓'
                                : '-'}R$ {transaction.amount.toFixed(2).replace('.', ',')}
                          </TransactionAmount>
                        </div>
                      </TransactionInfo>

                      <DeleteTransactionButton onClick={() => transaction.id && handleDeleteTransaction(transaction.id)}>
                        <FaTrash />
                      </DeleteTransactionButton>
                    </TransactionItem>
                  ))
                )}
              </TransactionsList>

              {transactions.length > itemsPerPage && (
                <PaginationContainer>
                  <PaginationButton
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </PaginationButton>
                  <PaginationInfo>
                    Página {currentPage} de {totalPages} ({transactions.length} total)
                  </PaginationInfo>
                  <PaginationButton
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </PaginationButton>
                </PaginationContainer>
              )}
            </>
          );
        })()}
      </FinanceSection>

      <Line />
      <Main>
        {editedTopics.map((sectionData, sectionIndex) => (
          <SectionContainer key={sectionIndex} $isVisible={visibleSections[sectionIndex]}>
            <h2 onClick={() => toggleVisibility(sectionIndex)}>
              <span>
                {visibleSections[sectionIndex] ? <IoIosArrowUp /> : <IoIosArrowDown />}
              </span>
              {sectionData.section}
            </h2>

            <div className="content">
              {sectionData.sectionitens.map((topicData, topicIndex) => (
                <TopicTasks key={topicIndex}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {editingTopic?.topicIndex === topicIndex ? (
                      <EditableInputTitle
                        value={topicData.topic}
                        onChange={(e) => handleEditChange(sectionIndex, topicIndex, null, "topic", e.target.value)}
                        onBlur={() => setEditingTopic(null)}
                        autoFocus
                      />
                    ) : (
                      <Topic onClick={() => setEditingTopic({ topicIndex })}>{topicData.topic}</Topic>
                    )}
                    <FaTrash
                      style={{ cursor: "pointer", color: "#bb2124", marginLeft: "10px" }}
                      onClick={() => markTopicForDeletion(sectionIndex, topicIndex)}
                    />
                  </div>
                  <TaskList>
                    {topicData.tasks.map((task, taskIndex) => {
                      const taskStatus = getTaskStatus(task.startDate, task.endDate);
                      const StatusIcon = taskStatus.icon;
                      const isUrgent = taskStatus.status === 'urgent' || taskStatus.status === 'overdue';

                      return (
                        <TaskCard key={taskIndex} $taskStatus={taskStatus} $isUrgent={isUrgent}>
                          <TaskContent>
                            <TaskInfo>
                              {editingName?.topicIndex === topicIndex && editingName?.taskIndex === taskIndex ? (
                                <EditableInput
                                  value={task.name}
                                  onChange={(e) => handleEditChange(sectionIndex, topicIndex, taskIndex, "name", e.target.value)}
                                  onBlur={() => setEditingName(null)}
                                  autoFocus
                                />
                              ) : (
                                <TaskTitle onClick={() => setEditingName({ topicIndex, taskIndex })}>
                                  {task.name}
                                </TaskTitle>
                              )}

                              <TaskDates>
                                <span>
                                  <strong>Início:</strong>
                                  {editingDate?.topicIndex === topicIndex && editingDate?.taskIndex === taskIndex && editingDate?.field === "startDate" ? (
                                    <EditableInput
                                      type="date"
                                      value={task.startDate}
                                      onChange={(e) => handleEditChange(sectionIndex, topicIndex, taskIndex, "startDate", e.target.value)}
                                      onBlur={() => setEditingDate(null)}
                                      autoFocus
                                    />
                                  ) : (
                                    <DateValue onClick={() => setEditingDate({ topicIndex, taskIndex, field: "startDate" })}>
                                      {task.startDate}
                                    </DateValue>
                                  )}
                                </span>

                                <span>
                                  <strong>Vencimento:</strong>
                                  {editingDate?.topicIndex === topicIndex && editingDate?.taskIndex === taskIndex && editingDate?.field === "endDate" ? (
                                    <EditableInput
                                      type="date"
                                      value={task.endDate}
                                      onChange={(e) => handleEditChange(sectionIndex, topicIndex, taskIndex, "endDate", e.target.value)}
                                      onBlur={() => setEditingDate(null)}
                                      autoFocus
                                    />
                                  ) : (
                                    <DateValue onClick={() => setEditingDate({ topicIndex, taskIndex, field: "endDate" })}>
                                      {task.endDate}
                                    </DateValue>
                                  )}
                                </span>
                              </TaskDates>
                            </TaskInfo>

                            <TaskStatus>
                              <StatusBadge $taskStatus={taskStatus}>
                                <StatusIcon />
                                <span>{taskStatus.label}</span>
                              </StatusBadge>
                              <DaysCounter $taskStatus={taskStatus}>
                                {taskStatus.daysText}
                              </DaysCounter>

                              <TaskActions>
                                <DeleteButton onClick={() => markTaskForDeletion(sectionIndex, topicIndex, taskIndex)}>
                                  <FaTrash />
                                </DeleteButton>
                              </TaskActions>
                            </TaskStatus>
                          </TaskContent>

                        </TaskCard>
                      );
                    })}

                    {addingTaskIndex === topicIndex && (
                      <NewTasks>
                        <div>
                          <EditableInput
                            type="text"
                            value={newTaskName}
                            placeholder="Nome da tarefa"
                            onChange={(e) => setNewTaskName(e.target.value)}
                          />
                          <EditableInput
                            type="date"
                            value={newStartDate}
                            placeholder="Data de início"
                            onChange={(e) => setNewStartDate(e.target.value)}
                          />
                          <EditableInput
                            type="date"
                            value={newEndDate}
                            placeholder="Data de fim"
                            onChange={(e) => setNewEndDate(e.target.value)}
                          />
                        </div>
                        <ButtonsNewTasks>
                          <NewButton onClick={() => handleAddTaskToTopic(sectionIndex, topicIndex)}>Adicionar Tarefa</NewButton>
                          <Cancel onClick={() => toggleCancelNewTask()}>Fechar</Cancel>
                        </ButtonsNewTasks>
                      </NewTasks>
                    )}

                  </TaskList>
                  {isEdited ? '' : <NewButton onClick={() => toggleAddNewTask(topicIndex)}>Nova tarefa</NewButton>}
                  <Line />
                </TopicTasks>
              ))}
            </div>
          </SectionContainer>
        ))}
        <SaveButton onClick={handleSave}><span>Salvar</span><span>alterações</span></SaveButton>
      </Main>
      <br />
      <NewTopicContainer>
        <Topic>Adicionar Novo Tópico</Topic>
        <NewTopic>
          <EditableInput
            type="text"
            placeholder="Nome do Tópico"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
            <option value="">Selecione uma seção</option>
            {topics.map((section) => (
              <option key={section.section} value={section.section}>
                {section.section}
              </option>
            ))}
          </select>
        </NewTopic>
        <NewButton onClick={handleAddNewTask}>Adicionar tópico</NewButton>
      </NewTopicContainer>

      <Line />

      {/* Seção de Rotina do Dia */}
      <RoutineSection>
        <RoutineHeader>
          <RoutineTitle>
            {workDayType === 'work' ? '💼' : '🏖️'} Rotina do Dia
          </RoutineTitle>
          <RoutineSubtitle>
            {workDayType === 'work' ? 'Dia de Trabalho Presencial' : 'Dia de Folga'}
          </RoutineSubtitle>
        </RoutineHeader>

        <RoutineContent>
          {(workDayType === 'work' ? workRoutine : offRoutine).map((item, index) => (
            <RoutineItem key={index}>
              {editingRoutineItem?.type === workDayType && editingRoutineItem?.index === index ? (
                <>
                  <RoutineItemContent>
                    <RoutineInput
                      type="text"
                      placeholder="🕐 Horário"
                      value={item.time}
                      onChange={async (e) => {
                        const newRoutine = workDayType === 'work' ? [...workRoutine] : [...offRoutine];
                        newRoutine[index].time = e.target.value;
                        const updatedRoutine = sortRoutineByTime(newRoutine);

                        if (workDayType === 'work') {
                          setWorkRoutine(updatedRoutine);
                        } else {
                          setOffRoutine(updatedRoutine);
                        }

                        // Auto-save
                        try {
                          const res = await fetch('/api/routine', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: workDayType, routine: updatedRoutine }),
                          });

                          if (res.ok) {
                            toast.success('Rotina salva automaticamente!', { duration: 2000 });
                          }
                        } catch (error) {
                          console.error('Erro ao salvar rotina:', error);
                        }
                      }}
                      autoFocus
                    />
                    <RoutineInput
                      type="text"
                      placeholder="📝 Atividade"
                      value={editingRoutineValue}
                      onChange={(e) => setEditingRoutineValue(e.target.value)}
                    />
                  </RoutineItemContent>
                  <RoutineActions>
                    <RoutineSaveButton onClick={() => handleSaveRoutineEdit(workDayType, index, 'activity')}>
                      ✓
                    </RoutineSaveButton>
                    <RoutineCancelButton onClick={() => {
                      setEditingRoutineItem(null);
                      setEditingRoutineValue("");
                    }}>
                      ✕
                    </RoutineCancelButton>
                  </RoutineActions>
                </>
              ) : (
                <>
                  <RoutineCheckbox
                    type="checkbox"
                    checked={checkedItems.has(`${workDayType}-${index}`)}
                    onChange={() => toggleCheckbox(workDayType, index)}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                  <RoutineItemContent onClick={() => handleEditRoutineItem(workDayType, index)}>
                    <RoutineTime $checked={checkedItems.has(`${workDayType}-${index}`)}>
                      {item.time}
                    </RoutineTime>
                    <RoutineActivity $checked={checkedItems.has(`${workDayType}-${index}`)}>
                      {item.activity}
                    </RoutineActivity>
                  </RoutineItemContent>

                  <RoutineActions>
                    <RoutineDeleteButton onClick={() => handleDeleteRoutineItem(workDayType, index)}>
                      🗑️
                    </RoutineDeleteButton>
                  </RoutineActions>
                </>
              )}
            </RoutineItem>
          ))}

          {isAddingRoutineItem && (
            <RoutineAddForm>
              <RoutineItemContent>
                <RoutineInput
                  type="text"
                  placeholder="🕐 Horário (ex: 08:00)"
                  value={newRoutineTime}
                  onChange={(e) => setNewRoutineTime(e.target.value)}
                  style={{ minWidth: '100px', flexShrink: 0 }}
                />
                <RoutineInput
                  type="text"
                  placeholder="📝 Atividade"
                  value={newRoutineActivity}
                  onChange={(e) => setNewRoutineActivity(e.target.value)}
                  style={{ flex: 1 }}
                />
              </RoutineItemContent>

              <RoutineAddButtons>
                <RoutineSaveButton onClick={() => handleAddRoutineItem(workDayType)}>
                  ✓
                </RoutineSaveButton>
                <RoutineCancelButton onClick={() => {
                  setIsAddingRoutineItem(false);
                  setNewRoutineTime("");
                  setNewRoutineActivity("");
                }}>
                  ✕
                </RoutineCancelButton>
              </RoutineAddButtons>
            </RoutineAddForm>
          )}

          {!isAddingRoutineItem && (
            <RoutineAddButton onClick={() => setIsAddingRoutineItem(true)}>
              + Adicionar Item
            </RoutineAddButton>
          )}
        </RoutineContent>
      </RoutineSection>

      <Line />

      <ExpenseReportSection>
        <ExpenseReportHeader>
          <ExpenseReportTitle>📊 Relatório de Despesas</ExpenseReportTitle>
          <ExpenseReportSubtitle>
            Visão mensal com agrupamento por nome e detalhes ao expandir
          </ExpenseReportSubtitle>
          <ExpenseReportControls>
            <ExpenseSortLabel>Ordenar lista de agrupamentos</ExpenseSortLabel>
            <ExpenseSortButtons>
              <ExpenseSortButton
                type="button"
                $active={expenseReportSort === 'count'}
                onClick={() => setExpenseReportSort('count')}
                aria-pressed={expenseReportSort === 'count'}
              >
                Itens
              </ExpenseSortButton>
              <ExpenseSortButton
                type="button"
                $active={expenseReportSort === 'total'}
                onClick={() => setExpenseReportSort('total')}
                aria-pressed={expenseReportSort === 'total'}
              >
                Valores totais
              </ExpenseSortButton>
            </ExpenseSortButtons>
          </ExpenseReportControls>
        </ExpenseReportHeader>

        {expenseReportByMonth.length === 0 ? (
          <ExpenseReportEmpty>Sem despesas registradas ainda.</ExpenseReportEmpty>
        ) : (
          <ExpenseReportMonths>
            {expenseReportByMonth.map((month) => (
              <ExpenseMonthCard key={month.key}>
                <ExpenseMonthHeader>
                  <div>
                    <ExpenseMonthTitle>{month.label}</ExpenseMonthTitle>
                    <ExpenseMonthMeta>{month.count} despesas registradas</ExpenseMonthMeta>
                  </div>
                  <ExpenseMonthTotal>R$ {formatCurrency(month.total)}</ExpenseMonthTotal>
                </ExpenseMonthHeader>

                {(month.topGroupsByCount.length > 0 || month.topGroupsByValue.length > 0) && (
                  <ExpenseCardsRow>
                    {month.topGroupsByCount.length > 0 && (
                      <ExpenseCardsColumn>
                        <ExpenseCardsTitle>Maior quantidade de itens</ExpenseCardsTitle>
                        <ExpenseCardsGrid>
                          {month.topGroupsByCount.map((card) => (
                        <ExpenseSummaryCard key={`count-${card.id}`} title={buildTooltipTitle(card.items)}>
                          <ExpenseSummaryCardContent>
                              <ExpenseSummaryLabel>{card.label}</ExpenseSummaryLabel>
                              <ExpenseSummaryValue>R$ {formatCurrency(card.total)}</ExpenseSummaryValue>
                              <ExpenseSummaryMeta>{card.count} evento(s)</ExpenseSummaryMeta>
                              <ExpenseSummaryHint>{card.hint}</ExpenseSummaryHint>
                          <ExpenseSummaryTooltip>
                            <ExpenseSummaryTooltipTitle>Itens</ExpenseSummaryTooltipTitle>
                            <ExpenseSummaryTooltipList>
                              {card.items.length === 0 ? (
                                <ExpenseSummaryTooltipItem>Nenhum item encontrado</ExpenseSummaryTooltipItem>
                              ) : (
                                card.items.map((item, itemIndex) => (
                                  <ExpenseSummaryTooltipItem key={`${card.id}-count-${itemIndex}`}>
                                    {item}
                                  </ExpenseSummaryTooltipItem>
                                ))
                              )}
                            </ExpenseSummaryTooltipList>
                          </ExpenseSummaryTooltip>
                          </ExpenseSummaryCardContent>
                            </ExpenseSummaryCard>
                          ))}
                        </ExpenseCardsGrid>
                      </ExpenseCardsColumn>
                    )}

                    {month.topGroupsByValue.length > 0 && (
                      <ExpenseCardsColumn>
                        <ExpenseCardsTitle>Maiores valores totais</ExpenseCardsTitle>
                        <ExpenseCardsGrid>
                          {month.topGroupsByValue.map((card) => (
                        <ExpenseSummaryCard key={`value-${card.id}`} title={buildTooltipTitle(card.items)}>
                          <ExpenseSummaryCardContent>
                              <ExpenseSummaryLabel>{card.label}</ExpenseSummaryLabel>
                              <ExpenseSummaryValue>R$ {formatCurrency(card.total)}</ExpenseSummaryValue>
                              <ExpenseSummaryMeta>{card.count} evento(s)</ExpenseSummaryMeta>
                              <ExpenseSummaryHint>{card.hint}</ExpenseSummaryHint>
                          <ExpenseSummaryTooltip>
                            <ExpenseSummaryTooltipTitle>Itens</ExpenseSummaryTooltipTitle>
                            <ExpenseSummaryTooltipList>
                              {card.items.length === 0 ? (
                                <ExpenseSummaryTooltipItem>Nenhum item encontrado</ExpenseSummaryTooltipItem>
                              ) : (
                                card.items.map((item, itemIndex) => (
                                  <ExpenseSummaryTooltipItem key={`${card.id}-value-${itemIndex}`}>
                                    {item}
                                  </ExpenseSummaryTooltipItem>
                                ))
                              )}
                            </ExpenseSummaryTooltipList>
                          </ExpenseSummaryTooltip>
                          </ExpenseSummaryCardContent>
                            </ExpenseSummaryCard>
                          ))}
                        </ExpenseCardsGrid>
                      </ExpenseCardsColumn>
                    )}
                  </ExpenseCardsRow>
                )}

                {month.categoryCards.length > 0 && (
                  <ExpenseCardsSection>
                    <ExpenseCardsTitle>Categorias inteligentes</ExpenseCardsTitle>
                    <ExpenseCardsScroll>
                      {([...month.categoryCards].sort((a, b) => {
                        if (expenseReportSort === 'count') {
                          return b.count - a.count || b.total - a.total || a.label.localeCompare(b.label);
                        }
                        return b.total - a.total || b.count - a.count || a.label.localeCompare(b.label);
                      })).map((card) => (
                        <ExpenseSummaryScrollCard key={`category-${card.id}`} title={buildTooltipTitle(card.items)}>
                          <ExpenseSummaryCardContent>
                          <ExpenseSummaryLabel>{card.label}</ExpenseSummaryLabel>
                          <ExpenseSummaryValue>R$ {formatCurrency(card.total)}</ExpenseSummaryValue>
                          <ExpenseSummaryMeta>{card.count} evento(s)</ExpenseSummaryMeta>
                          <ExpenseSummaryHint>{card.hint}</ExpenseSummaryHint>
                          <ExpenseSummaryTooltip>
                            <ExpenseSummaryTooltipTitle>Itens</ExpenseSummaryTooltipTitle>
                            <ExpenseSummaryTooltipList>
                              {card.items.length === 0 ? (
                                <ExpenseSummaryTooltipItem>Nenhum item encontrado</ExpenseSummaryTooltipItem>
                              ) : (
                                card.items.map((item, itemIndex) => (
                                  <ExpenseSummaryTooltipItem key={`${card.id}-category-${itemIndex}`}>
                                    {item}
                                  </ExpenseSummaryTooltipItem>
                                ))
                              )}
                            </ExpenseSummaryTooltipList>
                          </ExpenseSummaryTooltip>
                          </ExpenseSummaryCardContent>
                        </ExpenseSummaryScrollCard>
                      ))}
                    </ExpenseCardsScroll>
                  </ExpenseCardsSection>
                )}

                <ExpenseGroupsList>
                  {sortExpenseGroups(month.groups).map((group) => (
                    <ExpenseGroup key={group.key}>
                      <ExpenseGroupSummary>
                        <ExpenseGroupTitle>
                          <ExpenseGroupName>{group.name}</ExpenseGroupName>
                          <ExpenseGroupCount>{group.count} itens</ExpenseGroupCount>
                        </ExpenseGroupTitle>
                        <ExpenseGroupTotal>R$ {formatCurrency(group.total)}</ExpenseGroupTotal>
                      </ExpenseGroupSummary>
                      <ExpenseGroupItems>
                        {group.items.map((item, index) => {
                          const itemTags = parseTags(item.tags);
                          const rawTag = itemTags[0] ?? '';
                          const normalizedRawTag = rawTag ? normalizeText(rawTag) : '';
                          const resolvedTag = rawTag
                            ? (tagOptionsMap.get(normalizedRawTag) ?? rawTag)
                            : '';
                          const tagOptionsForItem = rawTag && !tagOptionsMap.has(normalizedRawTag)
                            ? [rawTag, ...tagOptions]
                            : tagOptions;

                          return (
                            <ExpenseItem key={item.id ?? `${group.key}-${index}`}>
                              <ExpenseItemInfo>
                                <ExpenseItemDescription>{item.description || group.name}</ExpenseItemDescription>
                                <ExpenseItemMeta>
                                  <span>{formatDateTime(item.created_at)}</span>
                                  <span>{(item.paymentMethod ?? 'credit') === 'debit' ? 'Débito' : 'Crédito'}</span>
                                </ExpenseItemMeta>
                                <ExpenseItemTagRow>
                                  {item.id && editingTagId === item.id ? (
                                    <ExpenseTagSelect
                                      value={resolvedTag}
                                      onChange={(event) => handleUpdateTransactionTags(item.id as string, event.target.value)}
                                      onBlur={() => setEditingTagId(null)}
                                    >
                                      <option value="">Sem tag</option>
                                      {tagOptionsForItem.map((tagOption) => (
                                        <option key={`${item.id}-${tagOption}`} value={tagOption}>
                                          {formatTagLabel(tagOption)}
                                        </option>
                                      ))}
                                    </ExpenseTagSelect>
                                  ) : (
                                    <ExpenseTagButton
                                      type="button"
                                      onClick={() => item.id && setEditingTagId(item.id)}
                                      disabled={!item.id}
                                    >
                                      {resolvedTag ? formatTagLabel(resolvedTag) : 'Sem tag'}
                                    </ExpenseTagButton>
                                  )}
                                </ExpenseItemTagRow>
                              </ExpenseItemInfo>
                              <ExpenseItemAmount>
                                {item.multiplier > 1 ? (
                                  <>
                                    <span>R$ {formatCurrency(item.amount)} x{item.multiplier}</span>
                                    <ExpenseItemTotal>R$ {formatCurrency(item.effectiveAmount)}</ExpenseItemTotal>
                                  </>
                                ) : (
                                  <span>R$ {formatCurrency(item.amount)}</span>
                                )}
                              </ExpenseItemAmount>
                            </ExpenseItem>
                          );
                        })}
                      </ExpenseGroupItems>
                    </ExpenseGroup>
                  ))}
                </ExpenseGroupsList>
              </ExpenseMonthCard>
            ))}
          </ExpenseReportMonths>
        )}
      </ExpenseReportSection>

      {isAuthenticated && (
        <NubankSection>
          <NubankHeader>
            <div>
              <NubankTitle>📑 Leitor de Faturas Nubank</NubankTitle>
              <NubankSubtitle>
                Faça upload das faturas em PDF e gere um relatório apenas com as transações.
              </NubankSubtitle>
            </div>
            <NubankActions>
              <NubankActionButton type="button" onClick={handleParseNubankInvoices} disabled={nubankIsParsing}>
                {nubankIsParsing ? 'Processando...' : 'Processar PDFs'}
              </NubankActionButton>
              <NubankSecondaryButton type="button" onClick={handleClearNubank} disabled={nubankIsParsing}>
                Limpar
              </NubankSecondaryButton>
            </NubankActions>
          </NubankHeader>

          <NubankUploadCard>
            <NubankUploadTitle>Adicionar faturas</NubankUploadTitle>
            <NubankUploadHint>Somente PDFs da Nubank com a aba de transações.</NubankUploadHint>
            <NubankUploadInput
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => handleNubankFilesSelected(event.target.files)}
            />
            {nubankFiles.length > 0 && (
              <NubankFileList>
                {nubankFiles.map((file) => (
                  <li key={file.name}>{file.name}</li>
                ))}
              </NubankFileList>
            )}
            {nubankError && <NubankError>{nubankError}</NubankError>}
          </NubankUploadCard>

          <NubankSummaryGrid>
            <NubankSummaryCard>
              <span>Total de transações</span>
              <strong>{nubankSummary.count}</strong>
            </NubankSummaryCard>
            <NubankSummaryCard>
              <span>Total geral</span>
              <strong>R$ {formatCurrency(nubankSummary.total)}</strong>
            </NubankSummaryCard>
            <NubankSummaryCard>
              <span>Compras</span>
              <strong>R$ {formatCurrency(nubankSummary.positive)}</strong>
            </NubankSummaryCard>
            <NubankSummaryCard>
              <span>Estornos/Créditos</span>
              <strong>R$ {formatCurrency(Math.abs(nubankSummary.negative))}</strong>
            </NubankSummaryCard>
          </NubankSummaryGrid>

          <NubankTransactions>
            {nubankTransactions.length === 0 ? (
              <NubankEmpty>Envie PDFs e clique em “Processar PDFs”.</NubankEmpty>
            ) : (
              nubankTransactions.map((transaction) => (
                <NubankTransactionCard key={transaction.id}>
                  <NubankTransactionHeader>
                    <span>{transaction.date}</span>
                    <NubankTag>#{formatTagLabel(transaction.tag)}</NubankTag>
                  </NubankTransactionHeader>
                  <NubankTransactionBody>
                    <strong>{transaction.description}</strong>
                    <span>{transaction.sourceFile}</span>
                  </NubankTransactionBody>
                  <NubankAmount $isNegative={transaction.amount < 0}>
                    {transaction.amountLabel}
                  </NubankAmount>
                </NubankTransactionCard>
              ))
            )}
          </NubankTransactions>
        </NubankSection>
      )}



    </Container>

  );
}

interface SectionContainerProps {
  $isVisible: boolean;
}

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1f2937 50%, #111827 100%);
`;

const AuthCard = styled.div`
  width: 100%;
  max-width: 380px;
  background: rgba(17, 24, 39, 0.9);
  border-radius: 20px;
  padding: 2.25rem 2rem;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
`;

const AuthTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
`;

const AuthSubtitle = styled.p`
  font-size: 0.95rem;
  color: #cbd5f5;
  margin: 0 auto;
  max-width: 260px;
  line-height: 1.5;
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AuthInput = styled.input`
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #0f172a;
  color: #e2e8f0;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AuthButton = styled.button`
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.35);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const AuthError = styled.span`
  color: #fca5a5;
  font-size: 0.85rem;
  text-align: left;
`;

const EditableInput = styled.input` 
  outline: none;
  background: transparent;
  border: none;
  border-bottom: 2px solid #3b82f6;
  color: #1f2937;
  font-size: inherit;
  font-weight: inherit;
  width: auto;
  min-width: 120px;
  display: inline-block;
  
  &:focus {
    border-bottom: 2px solid #1d4ed8;
    background: rgba(59, 130, 246, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    color: #f3f4f6;
    
    &:focus {
      background: rgba(59, 130, 246, 0.2);
    }
  }
`;

const EditableInputTitle = styled(EditableInput)`
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 8px;
`;

const SectionContainer = styled.div<SectionContainerProps>`
  padding: 0rem 1rem;
  border-radius: 10px;
  border-left: 2px solid #0070f3;
  overflow: hidden;
  transition: max-height 0.3s ease-in-out, padding 0.3s ease-in-out;

  h2 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
  }

  .content {
    padding: ${({ $isVisible }) => ($isVisible ? ".5rem" : "0")};
    max-height: ${({ $isVisible }) => ($isVisible ? "100%" : "0")};
    visibility: ${({ $isVisible }) => ($isVisible ? "visible" : "hidden")};
    transition: max-height 0.2s ease-in-out, visibility 0.3s ease-in-out, padding 0.3s ease-in-out;
  }
`;

const NewTasks = styled.div`
  display: flex;
  flex-direction: column;
`;


const ButtonsNewTasks = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: space-between;
`;


const NewTopic = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: .3rem;

  select {
    outline: none;
    padding: 0rem .2rem;
    border-radius: 15px 15px 0px 0px;
    border: 1px solid #0070f3;
  }
`;

const NewTopicContainer = styled.div`
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: .3rem;
`;

const Header = styled.div`
  text-align: center;
  padding: 2rem 0;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }

  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;


const Line = styled.div`
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #667eea, #764ba2, transparent);
  margin-bottom: 2rem;
  border-radius: 1px;
`;

const PrioritySection = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: transparent;
  border-radius: 16px;
`;

const PriorityHeader = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const PriorityTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;


const PriorityTasks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PriorityCard = styled.div<{ $taskStatus: TaskStatus; $isUrgent: boolean }>`
  background: ${({ $taskStatus }) => $taskStatus.bgColor};
  border: 2px solid ${({ $taskStatus }) => $taskStatus.borderColor};
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: fadeIn 0.5s ease-out;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  ${({ $isUrgent, $taskStatus }) =>
    $isUrgent &&
    css`
      animation: ${urgentPulse} 2s infinite, ${urgentGlow} 3s infinite, ${urgentBounce} 2s infinite;
      border-left: 4px solid ${$taskStatus.color};
    `}

  ${({ $taskStatus }) =>
    $taskStatus.isOverdue &&
    css`
      border-left: 4px solid ${$taskStatus.color};
      background: ${$taskStatus.bgColor};
      color: #ffffff;
      box-shadow: 0 4px 8px rgba(127, 29, 29, 0.3);
      animation: none;
      
      h4, span {
        color: #ffffff !important;
      }
    `}

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${({ $taskStatus }) => $taskStatus.color}, ${({ $taskStatus }) => $taskStatus.borderColor});
  }
`;

const PriorityCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const PriorityTaskInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

const PriorityTaskTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

const PriorityTaskDates = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #6b7280;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const PriorityTaskStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    align-self: flex-end;
  }
`;

const PrioritySectionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-right: 1rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
`;

const PrioritySectionName = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PriorityTopicName = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
`;

const NoPriorityTasks = styled.div`
  text-align: center;
  padding: 2rem;
  color: #64748b;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  span:first-child {
    font-size: 1.1rem;
    font-weight: 600;
    color: #059669;
  }
`;

const RoutineSection = styled.div`
  padding: 1.5rem;
  background: transparent;
  border-radius: 16px;
`;

const RoutineHeader = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const RoutineTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const RoutineSubtitle = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
`;

const RoutineContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RoutineItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #16a34a, #86efac);
  }
`;

const RoutineCheckbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #16a34a;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    width: 24px;
    height: 24px;
  }
`;

const RoutineItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
  cursor: pointer;
`;

const RoutineTime = styled.div<{ $checked?: boolean }>`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.$checked ? '#9ca3af' : '#166534'};
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 100px;
  text-decoration: ${props => props.$checked ? 'line-through' : 'none'};
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    min-width: 80px;
  }
`;

const RoutineActivity = styled.div<{ $checked?: boolean }>`
  font-size: 0.95rem;
  color: ${props => props.$checked ? '#9ca3af' : '#1f2937'};
  line-height: 1.5;
  flex: 1;
  cursor: pointer;
  padding: 0.25rem 0;
  border-radius: 4px;
  transition: all 0.3s ease;
  text-decoration: ${props => props.$checked ? 'line-through' : 'none'};
  word-wrap: break-word;
  overflow-wrap: break-word;

  &:hover {
    background-color: rgba(22, 163, 74, 0.05);
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const RoutineActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const RoutineDeleteButton = styled.button`
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 0.2rem 0.25rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  opacity: 0.6;

  &:hover {
    background: #ef4444;
    color: white;
    opacity: 1;
  }
`;

const RoutineAddButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;

  &:hover {
    background: #15803d;
    transform: translateY(-2px);
  }
`;

const RoutineAddForm = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #1f2937;
  border: 2px solid #86efac;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  flex-wrap: wrap;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #16a34a, #86efac);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const RoutineInput = styled.input`
  padding: 0.5rem;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  color: #c0c0c0;
  background: #1f2937;
  width: 100%;
  box-sizing: border-box;

  &::placeholder {
    color: #6b7280;
  }

  &:focus {
    border-color: #16a34a;
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 16px; /* Evita zoom no iOS */
    padding: 0.75rem;
  }
`;

const RoutineAddButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const RoutineSaveButton = styled.button`
  padding: 0.5rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #15803d;
    transform: scale(1.05);
  }
`;

const RoutineCancelButton = styled.button`
  padding: 0.5rem;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #4b5563;
    transform: scale(1.05);
  }
`;


const QuickNotesSection = styled.div`
  padding: 1.5rem;
  background: transparent;
  border-radius: 16px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`;

const QuickNotesHeader = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const QuickNotesTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const QuickNotesSubtitle = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
`;

const QuickNotesContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
`;

const QuickNotesDisplay = styled.div`
  width: 100%;
  min-width: 0;
  background: #1f2937;
  border: 2px solid #374151;
  border-radius: 12px;
  padding: 1.5rem;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  line-height: 1.8;
  white-space: pre-wrap;
  cursor: pointer;
  transition: all 0.3s ease;
  height: auto;
  min-height: auto;
  box-sizing: border-box;
  display: block;

  &:hover {
    border-color: #4b5563;
    background: #111827;
  }

  div {
    min-height: 1.5rem;
  }

  @media (max-width: 768px) {
    font-size: 16px; /* Mantém consistência com o textarea (evita zoom no iOS) */
    padding: 1rem;
  }
`;

const QuickNotesTextarea = styled.textarea`
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: auto;
  background: #1f2937;
  border: 2px solid #16a34a;
  border-radius: 12px;
  padding: 1.5rem;
  color: #e5e7eb;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  line-height: 1.8;
  resize: none;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  display: block;

  &:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 16px; /* Evita zoom no iOS */
    padding: 1rem;
  }
`;

const TopicTasks = styled.div`
`;


const SaveButton = styled.button`
  display: flex;
  flex-direction: column;
  bottom: 1rem;
  right: 1rem;
  position: fixed;
  padding: .4rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  z-index: 1000;
  &:hover {
    background-color: #005bb5;
  }
`;

const NewButton = styled.button`
  display: flex;
  flex-direction: column;
  padding: 0rem .5rem;
  background-color: #0070f3;
  margin: 2rem 0rem .7rem 0rem;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  &:hover {
    background-color: #005bb5;
  }
`;

const Cancel = styled.button`
  display: flex;
  flex-direction: column;
  padding: 0rem .5rem;
  background-color: red;
  margin: 2rem 0rem .7rem 0rem;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  &:hover {
    background-color: #005bb5;
  }
`;

const Container = styled.div`
  margin: 0 auto;
  align-items: center;
  justify-items: center;
  min-height: 100vh;
  padding: 8px 8px 20px;
  gap: 16px;
  font-family: var(--font-geist-sans);
  max-width: 1400px;

  @media (max-width: 768px) {
    padding: 4px 4px 16px;
  }
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  width: 100%;

  @media (max-width: 768px) {
    gap: 24px;
  }
`;

const Topic = styled.h3`
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 8px;
`;

const TaskList = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem 0;
`;

const TaskCard = styled.div<{ $taskStatus: TaskStatus; $isUrgent: boolean }>`
  background: ${({ $taskStatus }) => $taskStatus.bgColor};
  border: 2px solid ${({ $taskStatus }) => $taskStatus.borderColor};
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: fadeIn 0.5s ease-out;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  ${({ $isUrgent, $taskStatus }) =>
    $isUrgent &&
    css`
      animation: ${urgentPulse} 2s infinite, ${urgentGlow} 3s infinite, ${urgentBounce} 2s infinite;
      border-left: 4px solid ${$taskStatus.color};
    `}

  ${({ $taskStatus }) =>
    $taskStatus.isOverdue &&
    css`
      border-left: 4px solid ${$taskStatus.color};
      background: ${$taskStatus.bgColor};
      color: #ffffff;
      box-shadow: 0 4px 8px rgba(127, 29, 29, 0.3);
      animation: none;
      
      h4, span {
        color: #ffffff !important;
      }
    `}

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${({ $taskStatus }) => $taskStatus.color}, ${({ $taskStatus }) => $taskStatus.borderColor});
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    border-radius: 8px;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`;

const TaskContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const TaskInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

const TaskTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
  cursor: pointer;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;

  &:hover {
    color: #3b82f6;
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const TaskDates = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #6b7280;
  align-items: center;
  flex-wrap: nowrap;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }
`;

const DateValue = styled.span`
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: inline-block;
  white-space: nowrap;

  &:hover {
    background-color: rgba(59, 130, 246, 0.1);
  }
`;

const TaskStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    align-self: flex-end;
  }
`;

const StatusBadge = styled.div<{ $taskStatus: TaskStatus }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: ${({ $taskStatus }) => $taskStatus.color};
  color: white;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
`;

const DaysCounter = styled.div<{ $taskStatus: TaskStatus }>`
  color: ${({ $taskStatus }) => $taskStatus.color};
  font-weight: 700;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  border: 1px solid ${({ $taskStatus }) => $taskStatus.borderColor};
  white-space: nowrap;
`;

const TaskActions = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const DeleteButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;

  &:hover {
    background: #dc2626;
    transform: scale(1.05);
  }
`;

// Estilos para Controle Financeiro
const FinanceSection = styled.div`
  margin-bottom: 1.25rem;
  padding: 1.25rem;
  background: transparent;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.9rem;
    margin-bottom: 0.75rem;
    width: 100%;
    max-width: 100%;
  }
`;

const FinanceHeader = styled.div`
  text-align: center;
  margin-bottom: 1.2rem;

  @media (max-width: 768px) {
    margin-bottom: 0.9rem;
  }
`;

const FinanceTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.25rem;
    flex-wrap: wrap;
  }
`;

const FinanceSubtitle = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }
`;

const FinanceCards = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: nowrap;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    flex-direction: column !important;
    flex-wrap: nowrap !important;
    gap: 0.6rem;
    margin-bottom: 1rem;
    width: 100% !important;
    max-width: 100% !important;
  }
`;

const FinanceCard = styled.div<{ $type: 'income' | 'expense' }>`
  background: ${props => props.$type === 'income' ? '#f0fdf4' : '#fef2f2'};
  border: 2px solid ${props => props.$type === 'income' ? '#86efac' : '#fca5a5'};
  border-radius: 12px;
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  flex: 1;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    padding: 0.8rem 0.9rem;
    gap: 0.55rem;
    flex: none !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
      ${props => props.$type === 'income' ? '#16a34a' : '#dc2626'}, 
      ${props => props.$type === 'income' ? '#86efac' : '#fca5a5'});
  }
`;

const FinanceCardIcon = styled.div<{ $color?: 'income' | 'expense' | 'credit' | 'invoice' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) =>
    $color === 'income'
      ? '#15803d'
      : $color === 'credit'
        ? '#1d4ed8'
        : $color === 'invoice'
          ? '#7c3aed'
          : '#b91c1c'};
  font-size: 1.25rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const FinanceCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
`;

const FinanceCardLabel = styled.span`
  font-size: 0.85rem;
  color: #475569;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const FinanceCardValue = styled.span`
  font-size: 1.10rem;
  font-weight: 700;
  color: #0f172a;
  font-family: 'Courier New', monospace;
  word-break: break-word;
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;

  @media (max-width: 768px) {
    flex-direction: row;
    align-items: baseline;
    gap: 0.25rem;
  }
`;

const FinanceCardSecondaryValue = styled.span`
  font-size: 0.75rem;
  font-weight: 400;
  color: #64748b;
  font-family: 'Courier New', monospace;
  display: inline;
  vertical-align: baseline;

  @media (max-width: 768px) {
    display: inline;
    vertical-align: baseline;
    margin-top: 0;
  }
`;

const FinanceCardHint = styled.span`
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 300;
`;

const FinanceForm = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  position: relative;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
`;

const FinanceInputContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
`;

const FinanceInput = styled.input`
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: 2px solid #374151;
  border-radius: 8px;
  background: #1f2937;
  color: #e5e7eb;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: #6b7280;
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 16px; /* Evita zoom no iOS */
    padding: 0.75rem 0.9rem;
  }
`;

const FinanceTagContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 160px;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const FinanceTagSelect = styled.select`
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 2px solid #374151;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1f2937;
  border: 2px solid #374151;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    max-height: 150px;
  }
`;

const AutocompleteItem = styled.div<{ $isSelected: boolean }>`
  padding: 0.75rem 1rem;
  color: #e5e7eb;
  cursor: pointer;
  background: ${props => props.$isSelected ? '#374151' : 'transparent'};
  transition: background 0.2s ease;
  font-size: 0.95rem;

  &:hover {
    background: #374151;
  }

  &:first-child {
    border-top: 1px solid #374151;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1rem;
    font-size: 0.9rem;
  }
`;

const FinanceButton = styled.button`
  padding: 0.7rem 1.2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 0.8rem 1rem;
  }
`;

const TransactionsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.65rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }
`;

const TransactionItem = styled.div<{ $type: 'income' | 'expense' | 'invoice_payment' }>`
  background: #1f2937;
  border: 2px solid ${props =>
    props.$type === 'income'
      ? '#86efac'
      : props.$type === 'invoice_payment'
        ? '#a78bfa'
        : '#fca5a5'};
  border-radius: 12px;
  padding: 0.5rem 0.5rem;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.35rem 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    padding: 0.8rem 0.85rem;
    gap: 0.3rem 0.5rem;
  }
`;

const TransactionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

`;

const TransactionDescription = styled.span`
  font-size: 0.95rem;
  font-weight: 600;
  color: #f8fafc;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 0.93rem;
  }
`;

const PaymentTag = styled.span<{ $method: 'credit' | 'debit' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  align-self: flex-start;
  padding: 0.01rem 0.2rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ $method }) => ($method === 'debit' ? '#0f172a' : '#0f172a')};
  background: ${({ $method }) => ($method === 'debit' ? '#c5f36b' : '#fde68a')};
  border: 1px solid ${({ $method }) => ($method === 'debit' ? '#a3e635' : '#facc15')};
`;

const TransactionDate = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const TransactionAmount = styled.span<{ $type: 'income' | 'expense' | 'invoice_payment' }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${props =>
    props.$type === 'income'
      ? '#86efac'
      : props.$type === 'invoice_payment'
        ? '#a78bfa'
        : '#fca5a5'};
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  align-self: center;

  @media (max-width: 768px) {
    font-size: 1rem;
    text-align: right;
  }
`;

const DeleteTransactionButton = styled.button`
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 32px;
  min-height: 32px;
  grid-column: 2 / 3;
  grid-row: 1 / 2;

  &:hover {
    background: #ef4444;
    color: white;
  }

  @media (max-width: 768px) {
    padding: 0.45rem;
    min-width: 34px;
    min-height: 34px;
  }
`;

const NoTransactions = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }

  span:first-child {
    font-size: 1.1rem;
    font-weight: 600;
    color: #9ca3af;

    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }

  span:last-child {
    font-size: 0.9rem;
    color: #6b7280;

    @media (max-width: 768px) {
      font-size: 0.85rem;
      padding: 0 0.5rem;
    }
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.disabled ? '#374151' : '#3b82f6'};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 0.75rem;
  }
`;

const PaginationInfo = styled.span`
  font-size: 0.85rem;
  color: #9ca3af;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const ExpenseReportSection = styled.section`
  margin: 0.75rem 0 1.25rem;
  padding: 1rem;
  background: transparent;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const ExpenseReportHeader = styled.div`
  text-align: center;
  margin-bottom: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
`;

const ExpenseReportTitle = styled.h2`
  font-size: 1.35rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.15rem;
  }
`;

const ExpenseReportSubtitle = styled.p`
  font-size: 0.82rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0 0.5rem;
  }
`;

const ExpenseReportControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const ExpenseSortLabel = styled.span`
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ExpenseSortButtons = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const ExpenseSortButton = styled.button<{ $active: boolean }>`
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: ${props => (props.$active ? 'rgba(59, 130, 246, 0.25)' : 'rgba(2, 6, 23, 0.4)')};
  color: ${props => (props.$active ? '#e2e8f0' : '#94a3b8')};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(148, 163, 184, 0.5);
    color: #e2e8f0;
  }
`;

const ExpenseReportEmpty = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.35);
  border: 1px dashed rgba(148, 163, 184, 0.25);
  border-radius: 12px;
`;

const ExpenseReportMonths = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const ExpenseMonthCard = styled.div`
  border-radius: 16px;
  padding: 0.85rem;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.18);
  overflow: visible;
`;

const ExpenseMonthHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.65rem;
  flex-wrap: wrap;
`;

const ExpenseMonthTitle = styled.h3`
  font-size: 1rem;
  color: #e2e8f0;
  margin: 0;
  font-weight: 700;
`;

const ExpenseMonthMeta = styled.p`
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.3rem 0 0;
`;

const ExpenseMonthTotal = styled.span`
  font-size: 0.95rem;
  color: #f8fafc;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.25);
`;

const ExpenseCardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  overflow: visible;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ExpenseCardsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
  overflow: visible;
`;

const ExpenseCardsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
  overflow: visible;
`;

const ExpenseCardsTitle = styled.span`
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ExpenseCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
  overflow: visible;
`;

const ExpenseCardsScroll = styled.div`
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  overflow-y: visible;
  padding-bottom: 0.25rem;
  scroll-snap-type: x proximity;
  position: relative;
  z-index: 0;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 999px;
  }
`;

const ExpenseSummaryTooltip = styled.div`
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: max-content;
  max-width: 240px;
  max-height: 220px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  z-index: 30;
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: all 0.15s ease;
  pointer-events: none;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 999px;
  }
`;

const ExpenseSummaryTooltipTitle = styled.span`
  display: block;
  font-size: 0.7rem;
  color: #e2e8f0;
  font-weight: 700;
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ExpenseSummaryTooltipList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const ExpenseSummaryTooltipItem = styled.li`
  font-size: 0.72rem;
  color: #cbd5f5;
  line-height: 1.2;
`;

const ExpenseSummaryCard = styled.div`
  position: relative;
  overflow: visible;
  background: rgba(2, 6, 23, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 0.6rem;
  display: block;

  &:hover {
    z-index: 5;
  }

  &:hover ${ExpenseSummaryTooltip},
  &:focus-within ${ExpenseSummaryTooltip} {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const ExpenseSummaryScrollCard = styled(ExpenseSummaryCard)`
  flex: 0 0 180px;
  scroll-snap-align: start;
`;

const ExpenseSummaryCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 100%;
`;

const ExpenseSummaryLabel = styled.span`
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ExpenseSummaryValue = styled.span`
  font-size: 0.98rem;
  font-weight: 700;
  color: #f8fafc;
`;

const ExpenseSummaryMeta = styled.span`
  font-size: 0.72rem;
  color: #cbd5f5;
  font-weight: 600;
`;

const ExpenseSummaryHint = styled.span`
  font-size: 0.7rem;
  color: #64748b;
`;

const ExpenseGroupsList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 0.6rem;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ExpenseGroup = styled.details`
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
  width: 100%;
  align-self: start;

  &[open] {
    border-color: rgba(148, 163, 184, 0.3);
    background: rgba(15, 23, 42, 0.75);
  }

  summary {
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }
`;

const ExpenseGroupSummary = styled.summary`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  color: #e2e8f0;
  font-weight: 600;
`;

const ExpenseGroupTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const ExpenseGroupName = styled.span`
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExpenseGroupCount = styled.span`
  font-size: 0.7rem;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
`;

const ExpenseGroupTotal = styled.span`
  color: #f8fafc;
  font-size: 0.85rem;
`;

const ExpenseGroupItems = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ExpenseItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.12);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ExpenseItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`;

const ExpenseItemDescription = styled.span`
  font-size: 0.82rem;
  color: #e2e8f0;
  font-weight: 600;
  word-break: break-word;
`;

const ExpenseItemMeta = styled.div`
  display: flex;
  gap: 0.75rem;
  font-size: 0.7rem;
  color: #94a3b8;
  flex-wrap: wrap;
`;

const ExpenseItemTagRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ExpenseTagButton = styled.button`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: rgba(148, 163, 184, 0.6);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExpenseTagSelect = styled.select`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  outline: none;
`;

const NubankSection = styled.section`
  margin: 1.5rem 0 2rem;
  padding: 1.2rem;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const NubankHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const NubankTitle = styled.h2`
  font-size: 1.4rem;
  color: #f8fafc;
  margin: 0;
`;

const NubankSubtitle = styled.p`
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0.35rem 0 0;
  max-width: 560px;
`;

const NubankActions = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
`;

const NubankActionButton = styled.button`
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #4f46e5;
    transform: translateY(-1px);
  }
`;

const NubankSecondaryButton = styled.button`
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    border-color: rgba(148, 163, 184, 0.7);
  }
`;

const NubankUploadCard = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border-radius: 14px;
  padding: 1rem;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const NubankUploadTitle = styled.h3`
  font-size: 0.95rem;
  margin: 0;
  color: #e2e8f0;
`;

const NubankUploadHint = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
`;

const NubankUploadInput = styled.input`
  background: #0f172a;
  border-radius: 10px;
  padding: 0.6rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
`;

const NubankFileList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  li {
    font-size: 0.75rem;
    color: #e2e8f0;
    background: rgba(15, 23, 42, 0.6);
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }
`;

const NubankError = styled.div`
  color: #fca5a5;
  font-size: 0.8rem;
`;

const NubankSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
`;

const NubankSummaryCard = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  span {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  strong {
    font-size: 1.05rem;
    color: #f8fafc;
  }
`;

const NubankTransactions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
`;

const NubankTransactionCard = styled.div`
  background: rgba(2, 6, 23, 0.75);
  border-radius: 14px;
  padding: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const NubankTransactionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #94a3b8;
`;

const NubankTag = styled.span`
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const NubankTransactionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  strong {
    color: #f8fafc;
    font-size: 0.9rem;
  }

  span {
    color: #94a3b8;
    font-size: 0.7rem;
  }
`;

const NubankAmount = styled.span<{ $isNegative: boolean }>`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.$isNegative ? '#f87171' : '#4ade80'};
`;

const NubankEmpty = styled.div`
  text-align: center;
  padding: 1rem;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.3);
  color: #94a3b8;
  font-size: 0.85rem;
`;

const ExpenseItemAmount = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #f8fafc;
  font-weight: 600;
  white-space: nowrap;

  @media (max-width: 768px) {
    align-items: flex-start;
  }
`;

const ExpenseItemTotal = styled.span`
  font-size: 0.72rem;
  color: #fca5a5;
  font-weight: 700;
`;
