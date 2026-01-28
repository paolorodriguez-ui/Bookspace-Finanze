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
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'mine'
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
    const allUsers = [...users];
    const currentUserInList = allUsers.find(u => u.uid === userId);
    if (!currentUserInList && userId) {
      allUsers.push({ uid: userId, displayName: 'Yo', email: '' });
    }
    return allUsers.sort((a, b) => {
      const labelA = (a.displayName || a.email || a.uid).toLowerCase();
      const labelB = (b.displayName || b.email || b.uid).toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [users, userId]);

  const getAssigneeLabel = (uid) => {
    if (uid === userId) return 'Yo';
    const user = usersById[uid];
    if (!user) {
      const found = users.find(u => u.uid === uid);
      if (found) return found.displayName || found.email || 'Usuario sin nombre';
      return `Usuario (${uid.slice(0, 4)}...)`;
    }
    return user.displayName || user.email || 'Usuario sin nombre';
  };

  const filteredTasks = useMemo(() => {
    if (filterMode === 'mine' && userId) {
      return tasks.filter(t => (t.assignees || []).includes(userId) || t.createdBy === userId);
    }
    return tasks;
  }, [tasks, filterMode, userId]);

  const tasksByStatus = useMemo(() => {
    return STATUS_OPTIONS.reduce((acc, option) => {
      acc[option.value] = filteredTasks.filter((task) => task.status === option.value);
      return acc;
    }, {});
  }, [filteredTasks]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    const assignees = uniqueValues(assigneesSelected);
    const now = Date.now();
    const createdBy = userId || 'local';

    // NOTA: sharedWith se mantiene por compatibilidad, pero ya no restringe visibilidad
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
      // Actualizar sharedWith implícitamente si cambian asignados (para mantener consistencia de datos, aunque no afecte permisos)
      if (updates.assignees) {
        nextTask.sharedWith = buildSharedWith(nextTask, userId);
      }
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
    if (!window.confirm('¿Eliminar esta tarea permanentemente?')) return;

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

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#2a1d89]">Tablero de Tareas</h2>
            <p className="text-sm text-[#b7bac3]">
              {tasks.length} tareas totales • {filteredTasks.length} visibles
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#f8f9fc] p-1 rounded-xl">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'all' ? 'bg-white shadow text-[#2a1d89]' : 'text-[#b7bac3]'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterMode('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'mine' ? 'bg-white shadow text-[#2a1d89]' : 'text-[#b7bac3]'}`}
              >
                Mis tareas
              </button>
            </div>

            {!isAuthenticated && (
              <span className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" /> Modo local (sin sincronización)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Creator */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#2a1d89] mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nueva tarea
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#f8f9fc] border-0 rounded-xl px-4 py-3 text-sm font-medium placeholder-gray-400 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none"
              placeholder="¿Qué hay que hacer?"
              disabled={isCreating}
            />
          </div>
          <div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#f8f9fc] border-0 rounded-xl px-4 py-3 text-sm text-gray-600 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none"
              disabled={isCreating}
            />
          </div>
          <div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-[#f8f9fc] border-0 rounded-xl px-4 py-3 text-sm text-gray-600 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none cursor-pointer"
              disabled={isCreating}
            >
              {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="flex flex-wrap gap-2 items-center min-h-[44px] bg-[#f8f9fc] rounded-xl px-3 py-2">
                <span className="text-xs font-medium text-gray-400 mr-2">Asignar a:</span>
                {userOptions.map(user => {
                  const isSelected = assigneesSelected.includes(user.uid);
                  return (
                    <button
                      key={user.uid}
                      onClick={() => setAssigneesSelected(prev => isSelected ? prev.filter(id => id !== user.uid) : [...prev, user.uid])}
                      className={`px-2 py-1 rounded-md text-xs transition border ${isSelected ? 'bg-[#4f67eb] text-white border-[#4f67eb]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4f67eb]'}`}
                      type="button"
                    >
                      {user.displayName || user.email || 'User'}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating || !title.trim()}
              className="px-6 py-3 bg-[#4f67eb] text-white rounded-xl font-medium shadow-lg shadow-[#4f67eb]/30 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
            >
              {isCreating ? 'Guardando...' : 'Crear Tarea'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mt-3 bg-red-50 p-2 rounded-lg">{error}</p>}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
        {STATUS_OPTIONS.map((statusOption) => {
          const tasksForStatus = tasksByStatus[statusOption.value] || [];
          return (
            <div key={statusOption.value} className="bg-gray-50/50 rounded-2xl p-4 min-w-[280px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-bold text-[#2a1d89]">{statusOption.label}</h3>
                <span className="bg-white px-2 py-0.5 rounded-md text-xs font-bold text-[#b7bac3] shadow-sm">
                  {tasksForStatus.length}
                </span>
              </div>

              <div className="space-y-3">
                {tasksForStatus.map((task) => {
                  const priorityStyle = PRIORITY_OPTIONS.find(p => p.value === task.priority)?.styles || 'bg-gray-100';
                  const isSaving = savingTasks[task.id];

                  return (
                    <div key={task.id} className={`group bg-white rounded-xl p-4 shadow-sm border border-transparent hover:border-[#4f67eb]/20 hover:shadow-md transition-all relative ${isSaving ? 'opacity-70' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${priorityStyle}`}>
                          {PRIORITY_OPTIONS.find(p => p.value === task.priority)?.label}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDelete(task)} className="text-gray-300 hover:text-red-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-800 mb-1 leading-snug">{task.title}</h4>
                      {task.description && <p className="text-xs text-gray-500 mb-3">{task.description}</p>}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {(task.assignees || []).map(uid => (
                          <div key={uid} className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold border-2 border-white ring-1 ring-gray-100" title={getAssigneeLabel(uid)}>
                            {(getAssigneeLabel(uid)[0] || '?').toUpperCase()}
                          </div>
                        ))}
                        {(task.assignees || []).length === 0 && <span className="text-[10px] text-gray-400 italic">Sin asignar</span>}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                        {task.dueDate ? (
                          <span className={`text-xs flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        ) : <span />}

                        <select
                          value={task.status}
                          onChange={(e) => updateTask(task.id, { status: e.target.value })}
                          className="text-xs bg-gray-50 border-0 rounded-lg px-2 py-1 text-gray-600 focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-gray-100 transition"
                        >
                          {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {tasksForStatus.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-400">Sin tareas</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
