import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
import { deleteTaskFromCloud, isFirebaseConfigured, saveTaskToCloud } from '../../firebase';

/**
 * Modelo de tarea
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} status
 * @property {string} priority
 * @property {string | null} dueDate
 * @property {string[]} assignees
 * @property {string[]} sharedWith
 * @property {string} createdBy
 * @property {number} createdAt
 * @property {number} updatedAt
 */

const STATUS_OPTIONS = [
  { value: 'por_hacer', label: 'Por hacer' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'completado', label: 'Completado' }
];

const PRIORITY_OPTIONS = [
  { value: 'baja', label: 'Baja', styles: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'media', label: 'Media', styles: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'alta', label: 'Alta', styles: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'critica', label: 'Crítica', styles: 'bg-red-100 text-red-700 border-red-200' }
];

const buildTaskId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const uniqueValues = (values) => Array.from(new Set(values.filter(Boolean)));

const buildSharedWith = (task, userId) => {
  return uniqueValues([
    task.createdBy || userId,
    ...(task.sharedWith || []),
    ...(task.assignees || [])
  ]);
};

export default function TasksBoard({ tasks, onTasksChange, userId, isAuthenticated, users = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('por_hacer');
  const [priority, setPriority] = useState('media');
  const [dueDate, setDueDate] = useState('');
  const [assigneesSelected, setAssigneesSelected] = useState([]);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingTasks, setSavingTasks] = useState({});

  const buildErrorMessage = (response, fallback) => {
    if (!response) return fallback;
    return response.error || response.reason || fallback;
  };

  const usersById = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.uid] = user;
      return acc;
    }, {});
  }, [users]);

  const userOptions = useMemo(() => {
    return [...users].sort((a, b) => {
      const labelA = (a.displayName || a.email || a.uid).toLowerCase();
      const labelB = (b.displayName || b.email || b.uid).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [users]);

  const getAssigneeLabel = (uid) => {
    const user = usersById[uid];
    if (!user) return uid;
    if (user.displayName && user.email) {
      return `${user.displayName} · ${user.email}`;
    }
    return user.displayName || user.email || uid;
  };

  const tasksByStatus = useMemo(() => {
    return STATUS_OPTIONS.reduce((acc, option) => {
      acc[option.value] = tasks.filter((task) => task.status === option.value);
      return acc;
    }, {});
  }, [tasks]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    const assignees = uniqueValues(assigneesSelected);
    const now = Date.now();
    const createdBy = userId || 'local';
    const newTask = {
      id: buildTaskId(),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
      assignees,
      sharedWith: uniqueValues([createdBy, ...assignees]),
      createdBy,
      createdAt: now,
      updatedAt: now
    };

    const previousTasks = tasks;
    onTasksChange([newTask, ...tasks]);
    setTitle('');
    setDescription('');
    setDueDate('');
    setAssigneesSelected([]);
    setStatus('por_hacer');
    setPriority('media');
    setError(null);

    if (isFirebaseConfigured() && isAuthenticated && userId) {
      setIsCreating(true);
      try {
        const response = await saveTaskToCloud(userId, newTask);
        if (!response?.success) {
          onTasksChange(previousTasks);
          setError(buildErrorMessage(response, 'No se pudo guardar la tarea en la nube.'));
        } else {
          setError(null);
        }
      } finally {
        setIsCreating(false);
      }
    }
  };

  const updateTask = async (taskId, updates) => {
    const previousTasks = tasks;
    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) return task;
      const nextTask = {
        ...task,
        ...updates,
        updatedAt: Date.now()
      };
      nextTask.sharedWith = buildSharedWith(nextTask, userId);
      return nextTask;
    });

    const updatedTask = updatedTasks.find((task) => task.id === taskId);
    onTasksChange(updatedTasks);

    if (updatedTask && isFirebaseConfigured() && isAuthenticated && userId) {
      setSavingTasks((prev) => ({ ...prev, [taskId]: true }));
      try {
        const response = await saveTaskToCloud(userId, updatedTask);
        if (!response?.success) {
          onTasksChange(previousTasks);
          setError(buildErrorMessage(response, 'No se pudo sincronizar la tarea.'));
        } else {
          setError(null);
        }
      } finally {
        setSavingTasks((prev) => ({ ...prev, [taskId]: false }));
      }
    }
  };

  const handleDelete = async (taskToDelete) => {
    const confirmed = window.confirm('¿Eliminar esta tarea?');
    if (!confirmed) return;

    const previousTasks = tasks;
    onTasksChange(tasks.filter((task) => task.id !== taskToDelete.id));

    if (isFirebaseConfigured() && isAuthenticated && userId) {
      setSavingTasks((prev) => ({ ...prev, [taskToDelete.id]: true }));
      try {
        const response = await deleteTaskFromCloud(userId, taskToDelete);
        if (!response?.success) {
          onTasksChange(previousTasks);
          setError(buildErrorMessage(response, 'No se pudo eliminar la tarea en la nube.'));
        } else {
          setError(null);
        }
      } finally {
        setSavingTasks((prev) => ({ ...prev, [taskToDelete.id]: false }));
      }
    }
  };

  const handleRemoveAssignee = (taskId, assignee) => {
    const task = tasks.find((item) => item.id === taskId);
    const assignees = (task.assignees || []).filter((value) => value !== assignee);
    updateTask(taskId, { assignees });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#2a1d89]">Tareas del equipo</h2>
            <p className="text-sm text-[#b7bac3]">{tasks.length} tareas activas • sincronización por colección</p>
          </div>
          {!isAuthenticated && (
            <span className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" /> Inicia sesión para sincronizar y compartir tareas.
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#2a1d89] mb-4">Crear nueva tarea</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[#2a1d89]">Título</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
              placeholder="Ej. Revisar flujo de caja"
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#2a1d89]">Vencimiento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
              disabled={isCreating}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-[#2a1d89]">Descripción</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
              rows={3}
              placeholder="Detalles de la tarea..."
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#2a1d89]">Estado</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
              disabled={isCreating}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#2a1d89]">Prioridad</label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
              disabled={isCreating}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-[#2a1d89]">Asignados</label>
            <select
              multiple
              value={assigneesSelected}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setAssigneesSelected(values);
              }}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none min-h-[120px]"
            >
              {userOptions.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {getAssigneeLabel(user.uid)}
                </option>
              ))}
            </select>
            {userOptions.length === 0 && (
              <p className="text-xs text-[#b7bac3] mt-2">No hay usuarios registrados para asignar.</p>
            )}
            <label className="text-xs font-medium text-[#2a1d89]">Asignados (UIDs separados por coma)</label>
            <input
              value={assigneesInput}
              onChange={(event) => setAssigneesInput(event.target.value)}
              className="w-full mt-1 bg-[#f8f9fc] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
              placeholder="uid-1, uid-2"
              disabled={isCreating}
            />
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-3">{error}</p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isCreating}
          >
            <Plus className="w-4 h-4" />
            {isCreating ? 'Guardando...' : 'Crear tarea'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {STATUS_OPTIONS.map((statusOption) => {
          const tasksForStatus = tasksByStatus[statusOption.value] || [];
          return (
          <div key={statusOption.value} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#2a1d89]">{statusOption.label}</h3>
              <span className="text-xs text-[#b7bac3]">{tasksForStatus.length}</span>
            </div>
            <div className="space-y-3">
              {tasksForStatus.length === 0 && (
                <div className="border border-gray-100 rounded-xl p-4 bg-[#f8f9fc] text-center">
                  <p className="text-sm font-semibold text-[#2a1d89]">Sin tareas</p>
                  <p className="text-xs text-[#b7bac3] mt-1">
                    Aquí aparecerán las tareas de este estado.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus(statusOption.value)}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#4f67eb] hover:text-[#2a1d89]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crea una nueva tarea
                  </button>
                </div>
              )}
              {tasksForStatus.map((task) => {
                const isSavingTask = savingTasks[task.id];
                return (
                <div key={task.id} className="border border-gray-100 rounded-xl p-4 bg-[#f8f9fc]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#2a1d89]">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-[#b7bac3] mt-1">{task.description}</p>
                      )}
                      {isSavingTask && (
                        <p className="text-xs text-[#4f67eb] mt-1">Guardando cambios...</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(task)}
                      className="text-[#b7bac3] hover:text-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isSavingTask}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.styles || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.label || 'Media'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[#b7bac3]">
                      <Calendar className="w-3.5 h-3.5" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-MX') : 'Sin vencimiento'}
                    </div>
                    <span className="text-xs text-[#b7bac3]">Creada por {task.createdBy}</span>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-[#2a1d89]">Estado</label>
                    <select
                      value={task.status}
                      onChange={(event) => updateTask(task.id, { status: event.target.value })}
                      className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
                      disabled={isSavingTask}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-[#2a1d89]">Asignados</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(task.assignees || []).length === 0 && (
                        <span className="text-xs text-[#b7bac3]">Sin asignar</span>
                      )}
                      {(task.assignees || []).map((assignee) => (
                        <span key={assignee} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white border border-gray-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {getAssigneeLabel(assignee)}
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignee(task.id, assignee)}
                            className="text-[#b7bac3] hover:text-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={isSavingTask}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="text-xs text-[#2a1d89]">Actualizar asignados</label>
                      <select
                        multiple
                        value={task.assignees || []}
                        onChange={(event) => {
                          const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                          updateTask(task.id, { assignees: uniqueValues(values) });
                        }}
                        className="w-full mt-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none min-h-[100px]"
                        disabled={isSavingTask}
                      >
                        {userOptions.map((user) => (
                          <option key={user.uid} value={user.uid}>
                            {getAssigneeLabel(user.uid)}
                          </option>
                        ))}
                      </select>
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        value={assigneeDrafts[task.id] || ''}
                        onChange={(event) => setAssigneeDrafts((prev) => ({ ...prev, [task.id]: event.target.value }))}
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none disabled:opacity-60"
                        placeholder="Agregar UID"
                        disabled={isSavingTask}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddAssignee(task.id)}
                        className="px-3 py-2 bg-[#4f67eb] text-white rounded-lg text-xs font-medium hover:bg-[#2a1d89] transition flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSavingTask}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
