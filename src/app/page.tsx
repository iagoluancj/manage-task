"use client";

import styled, { css, keyframes } from "styled-components";
import { useEffect, useState } from "react";
import { differenceInDays, differenceInHours, isAfter, isBefore } from "date-fns";
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
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTopics(data);
        setEditedTopics(JSON.parse(JSON.stringify(data)));
      })
      .catch((err) => console.error("Erro ao buscar tarefas:", err));
  }, []);

  useEffect(() => {
    if (editedTopics.length > 0 && visibleSections.length === 0) {
      // Seção "Faculdade" sempre aberta, outras fechadas
      const initialVisibility = editedTopics.map(section =>
        section.section.toLowerCase().includes('faculdade1') ||
        section.section.toLowerCase().includes('tarefas1')
      );
      setVisibleSections(initialVisibility);
    }
  }, [editedTopics]);


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
      // Primeiro, salva as edições
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

      // Atualiza o estado com os dados editados e limpa a lista de deleções
      setTopics(editedTopics);
      setPendingDeletions([]);

      toast.success("Alterações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar mudanças:", error);
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




  return (
    <Container>
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

          {editedTopics.map((sectionData, sectionIndex) =>
            sectionData.sectionitens.map((topicData, topicIndex) =>
              topicData.tasks
                .map((task, taskIndex) => {
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
                            </TaskStatus>
                          </TaskContent>

                          <TaskActions>
                            <DeleteButton onClick={() => markTaskForDeletion(sectionIndex, topicIndex, taskIndex)}>
                              <FaTrash />
                            </DeleteButton>
                          </TaskActions>
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
    </Container>

  );
}

interface SectionContainerProps {
  $isVisible: boolean;
}

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

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 1rem;
  }

  @media (max-width: 480px) {
    font-size: 0.9rem;
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

const PriorityCard = styled.div<{ $taskStatus: any; $isUrgent: boolean }>`
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

const TopicTasks = styled.div`
`;

const TaskText = styled.span<{ $isPastDue: boolean }>`
  ${({ $isPastDue }) =>
    $isPastDue &&
    css`
      text-decoration: line-through; 
      color: #999; 
    `}
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

const TaskCard = styled.div<{ $taskStatus: any; $isUrgent: boolean }>`
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

const StatusBadge = styled.div<{ $taskStatus: any }>`
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

const DaysCounter = styled.div<{ $taskStatus: any }>`
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
