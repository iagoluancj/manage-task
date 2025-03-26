/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';

let tasks = [
  {
    section: "Faculdade",
    sectionitens: [
      {
        topic: "Análise Orientada a Objetos",
        tasks: [
          { name: "Avaliação virtual", startDate: "2025-02-03", endDate: "2025-03-03" },
          { name: "Avaliação virtual", startDate: "2025-02-03", endDate: "2025-03-10" },
          { name: "Portfólio", startDate: "2025-02-03", endDate: "2025-05-03" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Prova", startDate: "2025-03-08", endDate: "2025-03-15" }
        ]
      },
      {
        topic: "Linguagem Orientada a Objetos",
        tasks: [
          { name: "Avaliação virtual", startDate: "2025-02-24", endDate: "2025-03-31" },
          { name: "Avaliação virtual", startDate: "2025-02-24", endDate: "2025-04-07" },
          { name: "Portfólio", startDate: "2025-02-03", endDate: "2025-05-03" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Prova", startDate: "2025-03-29", endDate: "2025-04-05" }
        ]
      },
      {
        topic: "Modelagem de Dados",
        tasks: [
          { name: "Avaliação virtual", startDate: "2025-03-24", endDate: "2025-04-28" },
          { name: "Avaliação virtual", startDate: "2025-03-24", endDate: "2025-05-05" },
          { name: "Portfólio", startDate: "2025-02-03", endDate: "2025-05-03" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Prova", startDate: "2025-05-03", endDate: "2025-05-10" }
        ]
      },
      {
        topic: "Green It",
        tasks: [
          { name: "Avaliação virtual", startDate: "2025-02-03", endDate: "2025-05-19" },
          { name: "Avaliação virtual", startDate: "2025-02-03", endDate: "2025-05-26" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Prova", startDate: "2025-05-10", endDate: "2025-05-24" }
        ]
      },
      {
        topic: "Sistemas Operacionais",
        tasks: [
          { name: "Avaliação virtual", startDate: "2025-04-14", endDate: "2025-05-26" },
          { name: "Avaliação virtual", startDate: "2025-04-14", endDate: "2025-06-02" },
          { name: "Portfólio", startDate: "2025-02-03", endDate: "2025-05-17" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Avaliação virtual", startDate: "2025-06-03", endDate: "2025-06-07" },
          { name: "Prova", startDate: "2025-05-24", endDate: "2025-05-31" }
        ]
      },
      {
        topic: "Projeto de Extensão I - Análise e Desenvolvimento de Sistemas",
        tasks: [
          { name: "Portfólio Individual - Projeto de Extensão I", startDate: "2025-02-03", endDate: "2025-05-03" }
        ]
      },
    ]
  },
  {
    section: "Tarefas",
    sectionitens: [
      {
        topic: "A FAZER",
        tasks: [
          { name: "Teste técnico quinto andar", startDate: "2025-03-19", endDate: "2025-04-11" },
          { name: "OKR's", startDate: "2025-03-01", endDate: "2025-06-31" },
          { name: "Faculdade", startDate: "2025-02-01", endDate: "2025-06-20" },
        ]
      }
    ]
  }
];

// Método GET para buscar as tarefas
export async function GET() {
  return NextResponse.json(tasks);
}

// Método POST para adicionar novas tarefas
export async function POST(req: Request) {
  try {
    const { section, topic, task } = await req.json();

    // Verifique se 'section', 'topic' e 'task' foram fornecidos
    if (!section || !topic || !task) {
      return NextResponse.json({ error: "Section, topic, and task are required." }, { status: 400 });
    }

    // Encontre o índice da seção
    const sectionIndex = tasks.findIndex((s) => s.section === section);

    if (sectionIndex !== -1) {
      // Se a seção existir, verifique se o tópico já existe dentro da seção
      const topicIndex = tasks[sectionIndex].sectionitens.findIndex((t) => t.topic === topic);

      if (topicIndex !== -1) {
        // Se o tópico existir, adicione a nova tarefa ao tópico existente
        tasks[sectionIndex].sectionitens[topicIndex].tasks.push(task);
      } else {
        // Se o tópico não existir, adicione um novo tópico com a nova tarefa
        tasks[sectionIndex].sectionitens.push({ topic, tasks: [task] });
      }
    } else {
      // Se a seção não existir, crie uma nova seção com o novo tópico e tarefa
      tasks.push({ section, sectionitens: [{ topic, tasks: [task] }] });
    }

    return NextResponse.json({ message: "Seção, tópico e tarefa adicionados com sucesso!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}



export async function PUT(req: Request) {
  try {
    const updatedTasks = await req.json();
    tasks = updatedTasks;
    console.log(tasks);
    return NextResponse.json({ message: "Tarefas atualizadas com sucesso!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao processar a solicitação." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    console.log("Recebendo requisição DELETE com body:", body);

    const { section, topic, task } = await body;

    // Verifica se a seção existe
    const sectionIndex = tasks.findIndex((s) => s.section === section);
    if (sectionIndex === -1) {
      return NextResponse.json({ error: "Seção não encontrada." }, { status: 408 });
    }

    // Verifica se o tópico existe dentro da seção
    const topicIndex = tasks[sectionIndex].sectionitens.findIndex((t) => t.topic === topic);
    if (topicIndex === -1) {
      return NextResponse.json({ error: "Tópico não encontrado." }, { status: 407 });
    }

    if (task) {
      // Se um nome de tarefa for fornecido, remove apenas a tarefa
      const taskIndex = tasks[sectionIndex].sectionitens[topicIndex].tasks.findIndex((t) => t.name === task);
      if (taskIndex === -1) {
        return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 406 });
      }

      // Remove a tarefa específica
      tasks[sectionIndex].sectionitens[topicIndex].tasks.splice(taskIndex, 1);
      return NextResponse.json({ message: "Tarefa removida com sucesso!" }, { status: 200 });
    } else {
      // Se não houver uma tarefa específica, remove o tópico inteiro
      tasks[sectionIndex].sectionitens.splice(topicIndex, 1);
      return NextResponse.json({ message: "Tópico removido com sucesso!" }, { status: 200 });
    }
  } catch (error) {
    console.error("Erro ao processar DELETE:", error);
    return NextResponse.json({ error: "Erro ao processar a solicitação." }, { status: 400 });
  }
}
