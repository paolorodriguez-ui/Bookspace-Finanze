import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Users, Plus } from 'lucide-react';

const ESTADOS_JUNTA = [
  { id: 'todos', label: 'Todos los estados' },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'realizada', label: 'Realizada' },
  { id: 'cancelada', label: 'Cancelada' },
];

const estadoStyles = {
  pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
  realizada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelada: 'bg-red-100 text-red-700 border-red-200',
};

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

const formatMonthLabel = (date) =>
  new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(date);

const formatTime = (date) =>
  new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date);

const buildLeadOptions = (leads, meetings) => {
  const options = new Map();
  leads.forEach(lead => {
    const label = lead.venue || lead.contacto || 'Lead sin nombre';
    options.set(String(lead.id), label);
  });

  meetings.forEach(meeting => {
    if (!meeting.leadId && meeting.leadNombre && meeting.leadNombre !== 'Sin asignar') {
      options.set(`name:${meeting.leadNombre}`, meeting.leadNombre);
    }
  });

  return Array.from(options.entries()).map(([id, label]) => ({ id, label }));
};

export default function MeetingsCalendar({ meetings = [], leads = [], onSelectMeeting, onAddMeeting }) {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [leadFiltro, setLeadFiltro] = useState('todos');

  const leadsMap = useMemo(() => {
    return new Map(leads.map(lead => [String(lead.id), lead]));
  }, [leads]);

  const normalizedMeetings = useMemo(() => {
    return meetings.map(meeting => {
      const lead = meeting.leadId ? leadsMap.get(String(meeting.leadId)) : null;
      const leadNombre = meeting.leadNombre || lead?.venue || lead?.contacto || 'Sin asignar';
      const hora = meeting.hora || '00:00';
      const fecha = meeting.fecha || '';
      const start = fecha ? new Date(`${fecha}T${hora}`) : null;
      const duracion = Number(meeting.duracion) || 0;
      const end = start ? new Date(start.getTime() + duracion * 60000) : null;
      return {
        ...meeting,
        leadId: meeting.leadId ? String(meeting.leadId) : '',
        leadNombre,
        start,
        end,
        duracion,
        source: meeting,
      };
    });
  }, [meetings, leadsMap]);

  const leadOptions = useMemo(() => buildLeadOptions(leads, normalizedMeetings), [leads, normalizedMeetings]);

  const filteredMeetings = useMemo(() => {
    return normalizedMeetings.filter(meeting => {
      if (!meeting.start) return false;
      if (estadoFiltro !== 'todos' && meeting.estado !== estadoFiltro) return false;
      if (leadFiltro !== 'todos') {
        if (leadFiltro === 'sin-asignar') {
          return !meeting.leadId && (!meeting.leadNombre || meeting.leadNombre === 'Sin asignar');
        }
        if (leadFiltro.startsWith('name:')) {
          return meeting.leadNombre === leadFiltro.replace('name:', '');
        }
        return meeting.leadId === leadFiltro;
      }
      return true;
    }).sort((a, b) => a.start - b.start);
  }, [normalizedMeetings, estadoFiltro, leadFiltro]);

  const meetingsByDate = useMemo(() => {
    const grouped = new Map();
    filteredMeetings.forEach(meeting => {
      const key = formatDateKey(meeting.start);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(meeting);
    });
    return grouped;
  }, [filteredMeetings]);

  const monthStart = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const calendarStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const calendarDays = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i)), [calendarStart]);
  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const handlePrev = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (view === 'month') {
        next.setMonth(prev.getMonth() - 1);
      } else {
        next.setDate(prev.getDate() - 7);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (view === 'month') {
        next.setMonth(prev.getMonth() + 1);
      } else {
        next.setDate(prev.getDate() + 7);
      }
      return next;
    });
  };


  const renderMeetingPill = (meeting) => (
    <button
      key={meeting.id}
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // Avoid triggering day click
        onSelectMeeting?.(meeting.source || meeting);
      }}
      className={`w-full text-left border rounded-lg px-2 py-1.5 text-xs font-medium transition hover:shadow-md hover:scale-[1.02] transform duration-200 ${estadoStyles[meeting.estado] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{meeting.leadNombre}</span>
        {meeting.start && meeting.end && (
          <span className="text-[10px] whitespace-nowrap opacity-80">{formatTime(meeting.start)}</span>
        )}
      </div>
      <div className="text-[10px] opacity-75 truncate">{meeting.tipo || 'Junta'} • {meeting.lugar || 'Sin ubicación'}</div>
    </button>
  );

  const renderDayCell = (day) => {
    const dayKey = formatDateKey(day);
    const dayMeetings = meetingsByDate.get(dayKey) || [];
    const isCurrentMonth = day.getMonth() === monthStart.getMonth();
    const isToday = isSameDay(day, new Date());

    return (
      <div
        key={dayKey}
        onClick={() => onAddMeeting?.(day)}
        className={`border border-gray-100 rounded-xl p-2 min-h-[120px] flex flex-col gap-2 transition-colors cursor-pointer group hover:border-[#4f67eb]/30 ${isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-[#f8f9fc] text-[#b7bac3]'}`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold ${isToday ? 'bg-[#4f67eb] text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : 'text-[#2a1d89]'}`}>{day.getDate()}</span>
          {dayMeetings.length > 0 && (
            <span className="text-[10px] text-[#b7bac3]">{dayMeetings.length} junta{dayMeetings.length !== 1 ? 's' : ''}</span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-3.5 h-3.5 text-[#4f67eb]" />
          </div>
        </div>
        <div className="space-y-1">
          {dayMeetings.slice(0, 3).map(renderMeetingPill)}
          {dayMeetings.length > 3 && (
            <div className="text-[10px] text-[#4f67eb] px-1">+{dayMeetings.length - 3} más</div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekColumn = (day) => {
    const dayKey = formatDateKey(day);
    const dayMeetings = meetingsByDate.get(dayKey) || [];
    const isToday = isSameDay(day, new Date());

    return (
      <div
        key={dayKey}
        onClick={() => onAddMeeting?.(day)}
        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-[#4f67eb]/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className={`text-sm font-semibold ${isToday ? 'text-[#4f67eb]' : 'text-[#2a1d89]'}`}>
              {day.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-[#b7bac3]">{day.toLocaleDateString('es-MX', { month: 'long' })}</p>
          </div>
          <button className="text-[#4f67eb] hover:bg-[#4f67eb]/10 p-1.5 rounded-lg transition">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {dayMeetings.length === 0 ? (
            <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-xs text-[#b7bac3]">Click para agregar</p>
            </div>
          ) : (
            dayMeetings.map(renderMeetingPill)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4f67eb]/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-[#4f67eb]" />
          </div>
          <div>
            <p className="text-sm text-[#b7bac3]">Vista {view === 'month' ? 'mensual' : 'semanal'}</p>
            <h2 className="text-lg font-bold text-[#2a1d89] capitalize">{formatMonthLabel(currentDate)}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center bg-[#f8f9fc] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setView('month')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${view === 'month' ? 'bg-white text-[#2a1d89] shadow' : 'text-[#b7bac3]'}`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${view === 'week' ? 'bg-white text-[#2a1d89] shadow' : 'text-[#b7bac3]'}`}
            >
              Semana
            </button>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#f8f9fc] rounded-xl p-1">
            <button type="button" onClick={handlePrev} className="p-2 rounded-lg hover:bg-white transition">
              <ChevronLeft className="w-4 h-4 text-[#2a1d89]" />
            </button>
            <button type="button" onClick={handleNext} className="p-2 rounded-lg hover:bg-white transition">
              <ChevronRight className="w-4 h-4 text-[#2a1d89]" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-[#f8f9fc] px-3 py-2 rounded-xl">
            <Filter className="w-4 h-4 text-[#4f67eb]" />
            <select
              value={estadoFiltro}
              onChange={event => setEstadoFiltro(event.target.value)}
              className="bg-transparent text-sm font-medium text-[#2a1d89] outline-none cursor-pointer"
            >
              {ESTADOS_JUNTA.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#f8f9fc] px-3 py-2 rounded-xl">
            <Users className="w-4 h-4 text-[#4f67eb]" />
            <select
              value={leadFiltro}
              onChange={event => setLeadFiltro(event.target.value)}
              className="bg-transparent text-sm font-medium text-[#2a1d89] outline-none cursor-pointer"
            >
              <option value="todos">Todos los leads</option>
              {leadOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
              <option value="sin-asignar">Sin asignar</option>
            </select>
          </div>
          <div className="text-xs text-[#b7bac3] flex items-center">
            {filteredMeetings.length} junta{filteredMeetings.length !== 1 ? 's' : ''} mostrada{filteredMeetings.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2 text-xs text-[#b7bac3] mb-3">
            {dayNames.map(day => (
              <div key={day} className="text-center font-medium">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
            {calendarDays.map(renderDayCell)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {weekDays.map(renderWeekColumn)}
        </div>
      )}
    </div>
  );
}
