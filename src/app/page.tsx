"use client";

import styled, { css, keyframes } from "styled-components";
import { useEffect, useState } from "react";
import { differenceInDays, differenceInHours, isAfter, isBefore } from "date-fns";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { FaTrash } from "react-icons/fa";

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

const shakeEvery3s = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); }
  5% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  15% { transform: translate(-3px, 0px) rotate(1deg); }
  16.67% { transform: translate(0, 0) rotate(0deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
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


  const getTaskColor = (startDate: string | number | Date, endDate: string | number | Date) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const daysFromStart = differenceInDays(end, start);
    const daysToEnd = differenceInDays(end, now);
    const hoursToEnd = differenceInHours(end, now);

    // Caso data de fim esteja a menos de 24h
    if (hoursToEnd < 24 && hoursToEnd >= 0) {
      return "red";
    }

    // Caso a data de início ainda não tenha chegado
    if (isBefore(now, start)) {
      return "transparent"; 
    }

    // Se estamos no período da tarefa, aplicar o gradiente
    if (isAfter(now, start) && isBefore(now, end)) {
      const progress = (daysToEnd / daysFromStart) * 100;
      if (progress > 75) return "green"; // 75% do tempo ou mais restante
      if (progress > 50) return "blue"; // entre 50% e 75% do tempo restante
      if (progress > 25) return "#FFA500"; // entre 25% e 50% restante
      return "#FF8C00"; // menos de 25% restante
    }

    return "gray"; // tarefa já passou
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
      setVisibleSections(new Array(editedTopics.length).fill(false));
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
  
      alert("Alterações salvas com sucesso!");
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
      alert("Todos os campos devem ser preenchidos.");
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

      alert("Novo tópico e tarefa adicionados com sucesso!");
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

      alert("Tarefa adicionada com sucesso!");
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
      <div>
        <h1>Manage Tasks</h1>
      </div>
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
                      const taskColor = getTaskColor(task.startDate, task.endDate);
                      const isPastDue = new Date(task.endDate) < new Date();

                      return (
                        <TaskItem key={taskIndex} $taskColor={taskColor} $isShaking={taskColor === 'red' && differenceInHours(new Date(task.endDate), new Date()) < 24 && new Date(task.endDate) > new Date()}>
                          {editingName?.topicIndex === topicIndex && editingName?.taskIndex === taskIndex ? (
                            <EditableInput
                              value={task.name}
                              onChange={(e) => handleEditChange(sectionIndex, topicIndex, taskIndex, "name", e.target.value)}
                              onBlur={() => setEditingName(null)} 
                              autoFocus
                            />
                          ) : (
                            <TaskText $isPastDue={isPastDue} onClick={() => setEditingName({ topicIndex, taskIndex })}>
                              {task.name}
                            </TaskText>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <TaskDate>
                              {editingDate?.topicIndex === topicIndex && editingDate?.taskIndex === taskIndex && editingDate?.field === "startDate" ? (
                                <EditableInput
                                  type="date"
                                  value={task.startDate}
                                  onChange={(e) => handleEditChange(sectionIndex, topicIndex, taskIndex, "startDate", e.target.value)}
                                  onBlur={() => setEditingDate(null)}
                                  autoFocus
                                />
                              ) : (
                                <TaskText $isPastDue={isPastDue} onClick={() => setEditingDate({ topicIndex, taskIndex, field: "startDate" })}>
                                  {task.startDate}
                                </TaskText>
                              )}
                              <span> / </span>
                              {editingDate?.topicIndex === topicIndex && editingDate?.taskIndex === taskIndex && editingDate?.field === "endDate" ? (
                                <EditableInput
                                  type="date"
                                  value={task.endDate}
                                  onChange={(e) => handleEditChange(sectionIndex, topicIndex, taskIndex, "endDate", e.target.value)}
                                  onBlur={() => setEditingDate(null)}
                                  autoFocus
                                />
                              ) : (
                                <TaskText $isPastDue={isPastDue} onClick={() => setEditingDate({ topicIndex, taskIndex, field: "endDate" })}>
                                  {task.endDate}
                                </TaskText>
                              )}
                            </TaskDate>
                            <FaTrash
                              style={{ cursor: "pointer", color: "#bb2124", marginLeft: "10px" }}
                              onClick={() => markTaskForDeletion(sectionIndex, topicIndex, taskIndex)}
                            />
                          </div>
                        </TaskItem>
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
    </Container>

  );
}

interface SectionContainerProps {
  $isVisible: boolean;
}

const EditableInput = styled.input` 
  outline: none;
  &:focus {
    border-bottom: 1px solid #0070f3;
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
    border-radius: 15px;
    background-color: #0a0a0a;
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

const Line = styled.div`
  width: 100%;
  height: 1px;
  background-color: #0070f355;
  margin-bottom: 2rem;
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
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  width: 100%;
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;

const TaskItem = styled.li<{ $isShaking: boolean; $taskColor: string }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: .5rem;
  padding: .3rem 1rem;
  padding-bottom: .1rem;
  border-bottom: 1px solid ${({ $taskColor }) => $taskColor};

  border-radius: 15px;
  ${({ $isShaking }) =>
    $isShaking &&
    css`
      animation: ${shakeEvery3s} 2s infinite;
    `}
`;

const TaskDate = styled.span`
  font-style: italic;
  color: #666;
`;
