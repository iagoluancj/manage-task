"use client";

import styled, { css, keyframes } from "styled-components";
import { useEffect, useState, useRef, useCallback, FormEvent } from "react";
import { differenceInDays, differenceInHours, isBefore } from "date-fns";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { FaTrash, FaExclamationTriangle, FaClock, FaCheckCircle, FaCalendarAlt } from "react-icons/fa";
import { FaTasks } from "react-icons/fa";

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

  // Ajusta a altura do textarea automaticamente
  useEffect(() => {
    if (editingQuickNotes && textareaRef.current) {
      const scrollPosition = window.scrollY;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      window.scrollTo(0, scrollPosition);
    }
  }, [quickNotes, editingQuickNotes]);

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
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };

    loadData();
  }, [isAuthenticated, sortRoutineByTime]);


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
            <AuthHint>login: iago - senha: Asfas852@</AuthHint>
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
          <PrioritySubtitle>Urgentes, vencidas e que precisam de atenção</PrioritySubtitle>
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


      {/* Seção de Rotina e Notas Rápidas - Lado a Lado */}
      <RoutineAndNotesContainer>
        {/* Rotina */}
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

        {/* Notas Rápidas */}
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
      </RoutineAndNotesContainer>

      {/* Seção de Cronograma de Remédios para a Cachorra */}
      <MedicationScheduleSection>
        <MedicationHeader>
          <MedicationTitle>🐕 Cronograma de Remédios</MedicationTitle>
          <MedicationSubtitle>Horários para administração dos medicamentos</MedicationSubtitle>
        </MedicationHeader>

        <MedicationGrid>
          {/* Maxicam 0.5mg - 1 comprimido por dia, de 24 em 24h, por 5 dias */}
          <MedicationCard $color="#3b82f6">
            <MedicationCardHeader>
              <MedicationName>Maxicam 0.5mg</MedicationName>
              <MedicationDosage>1 comprimido por dia (24h)</MedicationDosage>
            </MedicationCardHeader>
            <MedicationSchedule>
              <MedicationDay>
                <DayLabel>04/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>05/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>06/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>07/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>08/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
            </MedicationSchedule>
          </MedicationCard>

          {/* Lactulose - 1ml de 12 em 12 horas, por 5 dias */}
          <MedicationCard $color="#10b981">
            <MedicationCardHeader>
              <MedicationName>Lactulose</MedicationName>
              <MedicationDosage>1ml de 12 em 12 horas</MedicationDosage>
            </MedicationCardHeader>
            <MedicationSchedule>
              <MedicationDay>
                <DayLabel>04/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>05/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>06/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>07/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>08/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
            </MedicationSchedule>
          </MedicationCard>

          {/* Metronidazol 400mg - 1/2 comprimido de 12 em 12 horas, por 7 dias */}
          <MedicationCard $color="#f59e0b">
            <MedicationCardHeader>
              <MedicationName>Metronidazol (400mg)</MedicationName>
              <MedicationDosage>1/2 comprimido de 12 em 12 horas</MedicationDosage>
            </MedicationCardHeader>
            <MedicationSchedule>
              <MedicationDay>
                <DayLabel>04/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>05/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>06/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>07/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>08/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>09/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>10/11/2025</DayLabel>
                <TimeSlot>11:50 | 23:50</TimeSlot>
              </MedicationDay>
            </MedicationSchedule>
          </MedicationCard>

          {/* Vermipet Plus 660mg - 1 comprimido hoje e outro daqui 15 dias */}
          <MedicationCard $color="#8b5cf6">
            <MedicationCardHeader>
              <MedicationName>Vermipet Plus 660mg</MedicationName>
              <MedicationDosage>1 comprimido (intervalo de 15 dias)</MedicationDosage>
            </MedicationCardHeader>
            <MedicationSchedule>
              <MedicationDay>
                <DayLabel>04/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
              <MedicationDay>
                <DayLabel>19/11/2025</DayLabel>
                <TimeSlot>11:50</TimeSlot>
              </MedicationDay>
            </MedicationSchedule>
          </MedicationCard>
        </MedicationGrid>
      </MedicationScheduleSection>
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

const AuthHint = styled.span`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.7);
  margin-top: -0.75rem;
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

const PrioritySubtitle = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
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

const RoutineAndNotesContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 3rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const QuickNotesSection = styled.div`
  padding: 1.5rem;
  background: transparent;
  border-radius: 16px;
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
`;

const QuickNotesDisplay = styled.div`
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

  &:hover {
    border-color: #4b5563;
    background: #111827;
  }

  div {
    min-height: 1.5rem;
  }
`;

const QuickNotesTextarea = styled.textarea`
  width: 100%;
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

const MedicationScheduleSection = styled.div`
  margin-top: 3rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: transparent;
  border-radius: 16px;
`;

const MedicationHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const MedicationTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const MedicationSubtitle = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
`;

const MedicationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MedicationCard = styled.div<{ $color: string }>`
  background: #1f2937;
  border: 2px solid ${props => props.$color};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${props => props.$color}, ${props => props.$color}88);
  }
`;

const MedicationCardHeader = styled.div`
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #374151;
`;

const MedicationName = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.25rem 0;
`;

const MedicationDosage = styled.p`
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0;
`;

const MedicationSchedule = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MedicationDay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #111827;
  border-radius: 8px;
  border: 1px solid #374151;
  transition: all 0.2s ease;

  &:hover {
    background: #1f2937;
    border-color: #4b5563;
  }
`;

const DayLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: #e5e7eb;
`;

const TimeSlot = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: #10b981;
  font-family: 'Courier New', monospace;
`;
