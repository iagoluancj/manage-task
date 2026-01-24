/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

type TaskItem = {
  name: string;
  startDate: string;
  endDate: string;
};

type Topic = {
  topic: string;
  tasks: TaskItem[];
};

type Section = {
  section: string;
  sectionitens: Topic[];
};

type TasksType = Section[];

// Helper para pegar o usuário do cookie
function getUserFromRequest(req: NextRequest): string {
  const user = req.cookies.get('app_user')?.value || 'iago';
  return user;
}

// Helper para pegar o nome da tabela baseado no usuário
function getTableName(user: string): string {
  return user === 'leticia' ? 'leticia_json_data' : 'json_data';
}

// Função para salvar os dados no Supabaseb
async function saveTasksToDB(newTasks: TasksType, tableName: string) {
  const { error } = await supabase
    .from(tableName)
    .update({ data: newTasks })
    .eq('name', 'Planejamento');

  if (error) console.error("Erro ao salvar tasks:", error);
}

// Método GET para buscar as tarefas
async function fetchTasksFromDB(tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('data')
    .eq('name', 'Planejamento') // <- ou 'Planejamento', se for esse o nome usado
    .single();

  if (error) {
    console.error("Erro ao buscar tasks:", error.message);
    return null;
  }

  return data.data; // <- porque seu campo JSON está em `data`
}

// Rota GET
export async function GET(req: NextRequest) {
  console.log("GET /api/tasks chamado");
  
  const user = getUserFromRequest(req);
  const tableName = getTableName(user);
  const tasks = await fetchTasksFromDB(tableName);

  // Garante que o retorno é sempre um array
  return NextResponse.json(tasks || []);
}

// Método POST para adicionar novas tarefas
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  const tableName = getTableName(user);
  const tasks = await fetchTasksFromDB(tableName);
  if (!tasks) return NextResponse.json({ error: "Erro ao carregar dados." }, { status: 500 });

  const { section, topic, task } = await req.json();

  // Mesma lógica de inserção...
  const sectionIndex = tasks.findIndex((s: Section) => s.section === section);

  if (sectionIndex !== -1) {
    const topicIndex = tasks[sectionIndex].sectionitens.findIndex((t: Topic) => t.topic === topic);
    if (topicIndex !== -1) {
      tasks[sectionIndex].sectionitens[topicIndex].tasks.push(task);
    } else {
      tasks[sectionIndex].sectionitens.push({ topic, tasks: [task] });
    }
  } else {
    tasks.push({ section, sectionitens: [{ topic, tasks: [task] }] });
  }

  await saveTasksToDB(tasks, tableName);

  return NextResponse.json({ message: "Tarefa adicionada com sucesso!" });
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const tableName = getTableName(user);
    const updatedTasks: TasksType = await req.json();

    await saveTasksToDB(updatedTasks, tableName);

    return NextResponse.json({ message: "Tarefas atualizadas com sucesso!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao processar a solicitação." }, { status: 400 });
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const tableName = getTableName(user);
    const { section, topic, task } = await req.json();

    const tasks = await fetchTasksFromDB(tableName);
    if (!tasks) {
      return NextResponse.json({ error: "Erro ao carregar tarefas." }, { status: 500 });
    }

    const sectionIndex = tasks.findIndex((s: Section) => s.section === section);
    if (sectionIndex === -1) {
      return NextResponse.json({ error: "Seção não encontrada." }, { status: 408 });
    }

    const topicIndex = tasks[sectionIndex].sectionitens.findIndex((t: Topic) => t.topic === topic);
    if (topicIndex === -1) {
      return NextResponse.json({ error: "Tópico não encontrado." }, { status: 407 });
    }

    if (task) {
      const taskIndex = tasks[sectionIndex].sectionitens[topicIndex].tasks.findIndex((t: TaskItem) => t.name === task);
      if (taskIndex === -1) {
        return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 406 });
      }

      tasks[sectionIndex].sectionitens[topicIndex].tasks.splice(taskIndex, 1);
    } else {
      tasks[sectionIndex].sectionitens.splice(topicIndex, 1);
    }

    await saveTasksToDB(tasks, tableName);

    return NextResponse.json({ message: "Remoção realizada com sucesso!" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao processar DELETE:", error);
    return NextResponse.json({ error: "Erro ao processar a solicitação." }, { status: 400 });
  }
}
