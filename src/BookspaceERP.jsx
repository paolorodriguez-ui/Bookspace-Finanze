import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Download, CheckCircle, Users, Receipt, Settings, X, BarChart3, Scale, ArrowUpRight, ArrowDownRight, Wallet, Building, CreditCard, PiggyBank, Search, Target, UserPlus, FileText, Printer, TrendingUp, DollarSign, User, Calendar, Clock, Filter, PieChart, Activity, AlertTriangle, CalendarDays, FileSpreadsheet, Home, Bell, ChevronDown, MoreHorizontal, Eye, Edit, Menu, Database, Cloud, RefreshCw } from 'lucide-react';

// Auth & Sync
import { useAuth, useCloudSync, SYNC_STATUS, useActivityLog } from './hooks';
import { AuthModal, SyncIndicator } from './components/auth';
import { UserMenu } from './components/layout';
import { saveUserDataToCloud, loadUserDataFromCloud, isFirebaseConfigured } from './firebase';
import { ActivityLog, ActivityWidget } from './components/ActivityLog';

// ========== CONSTANTES ==========
const CAT_ING = ['Comisiones', 'Premium', 'Premium +', 'Silver', 'Gold', 'Capital', 'Préstamo', 'Otro'];
const CAT_EGR = ['Implementación', 'Nómina', 'Marketing', 'Hosting', 'Licencias', 'Ads', 'Equipo', 'Otros'];
const CAJAS = ['Efectivo', 'Banco', 'Por cobrar', 'Por pagar'];
const TIPOS_VENUE = ['Salón', 'Terraza', 'Sala juntas', 'Jardín', 'Rooftop', 'Hacienda', 'Quinta', 'Restaurant', 'Hotel', 'Otro'];
const PLANES = [
  { id: 'basico', nombre: 'Básico', precio: 0 },
  { id: 'premium', nombre: 'Premium', precio: 2499 },
  { id: 'premium_plus', nombre: 'Premium +', precio: 3799 },
];
const EST_LEAD = [
  { id: 'nuevo', nombre: 'Nuevo', cl: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'contactado', nombre: 'Contactado', cl: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'interesado', nombre: 'Interesado', cl: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'negociacion', nombre: 'Negociación', cl: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'cerrado', nombre: 'Cerrado ✓', cl: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'perdido', nombre: 'Perdido', cl: 'bg-red-100 text-red-700 border-red-200' },
];
const FUENTES = ['Google', 'Facebook', 'Instagram', 'TikTok', 'Referido', 'WhatsApp', 'Evento', 'Otro'];
const EST_FACT = [
  { id: 'borrador', nombre: 'Borrador', cl: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'pendiente', nombre: 'Pendiente', cl: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'pagada', nombre: 'Pagada', cl: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'cancelada', nombre: 'Cancelada', cl: 'bg-red-100 text-red-700 border-red-200' },
];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_COMPLETOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// Bookspace Logo Component
const BookspaceLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="bookspaceGradient" x1="16" y1="10" x2="104" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4f67eb" />
        <stop offset="1" stopColor="#2a1d89" />
      </linearGradient>
    </defs>
    <rect x="10" y="18" width="100" height="92" rx="18" stroke="url(#bookspaceGradient)" strokeWidth="8" />
    <rect x="30" y="6" width="16" height="24" rx="6" fill="url(#bookspaceGradient)" />
    <rect x="52" y="6" width="16" height="24" rx="6" fill="url(#bookspaceGradient)" />
    <rect x="74" y="6" width="16" height="24" rx="6" fill="url(#bookspaceGradient)" />
    <rect x="30" y="46" width="34" height="34" rx="10" fill="#4f67eb" />
    <rect x="70" y="46" width="24" height="24" rx="8" fill="#2a1d89" />
    <rect x="30" y="78" width="20" height="20" rx="8" fill="#2a1d89" />
    <rect x="50" y="70" width="44" height="28" rx="12" fill="#4f67eb" />
  </svg>
);

// ========== COMPONENTE PRINCIPAL ==========
export default function BookspaceERP() {
  const [tab, setTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('cli');
  const [filtro, setFiltro] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [dbFiltro, setDbFiltro] = useState('');
  const [año, setAño] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [crmView, setCrmView] = useState('pipeline');
  const [draggingLeadId, setDraggingLeadId] = useState(null);
  const [dragOverEstado, setDragOverEstado] = useState(null);

  // Datos
  const [tx, setTx] = useState([]);
  const [cli, setCli] = useState([]);
  const [prov, setProv] = useState([]);
  const [emp, setEmp] = useState([]);
  const [leads, setLeads] = useState([]);
  const [fact, setFact] = useState([]);
  const [juntas, setJuntas] = useState([]);
  const [cfg, setCfg] = useState({ empresa: 'Bookspace', rfc: '', dir: '', tel: '', email: '' });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editData, setEditData] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Auth Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Autenticación
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    isConfigured: firebaseConfigured,
    login,
    logout,
    register,
    sendPasswordReset
  } = useAuth();

  // Datos para sincronización
  const allData = useMemo(() => ({
    transactions: tx,
    clients: cli,
    providers: prov,
    employees: emp,
    leads,
    invoices: fact,
    meetings: juntas,
    config: cfg
  }), [tx, cli, prov, emp, leads, fact, juntas, cfg]);

  // Callback para actualizar datos desde la nube
  const handleCloudDataUpdate = useCallback((cloudData) => {
    if (cloudData.transactions) setTx(cloudData.transactions);
    if (cloudData.clients) setCli(cloudData.clients);
    if (cloudData.providers) setProv(cloudData.providers);
    if (cloudData.employees) setEmp(cloudData.employees);
    if (cloudData.leads) setLeads(cloudData.leads);
    if (cloudData.invoices) setFact(cloudData.invoices);
    if (cloudData.meetings) setJuntas(cloudData.meetings);
    if (cloudData.config) setCfg(cloudData.config);
  }, []);

  // Sincronización con la nube
  const {
    isEnabled: syncEnabled,
    syncStatus,
    lastSyncTime,
    error: syncError,
    loadFromCloud,
    saveToCloudDebounced,
    syncWithCloud
  } = useCloudSync(user?.uid, allData, handleCloudDataUpdate);

  // Bitácora de actividad
  const {
    activities,
    loading: activityLoading,
    logTransaction,
    logClient,
    logProvider,
    logEmployee,
    logLead,
    logInvoice,
    logMeeting,
    logConfig,
    logUserLogin,
    logUserLogout,
    logDataSync,
    logDataExport
  } = useActivityLog(user?.uid);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const keys = ['bs12-tx', 'bs12-cli', 'bs12-prov', 'bs12-emp', 'bs12-leads', 'bs12-fact', 'bs12-juntas', 'bs12-cfg'];
        const setters = [setTx, setCli, setProv, setEmp, setLeads, setFact, setJuntas, setCfg];
        
        for (let i = 0; i < keys.length; i++) {
          try {
            const result = await window.storage.get(keys[i]);
            if (result && result.value) {
              setters[i](JSON.parse(result.value));
            }
          } catch (e) {
            console.log('Error loading', keys[i]);
          }
        }
      } catch (e) {
        console.log('Storage error');
      }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Guardar datos (local + nube)
  useEffect(() => {
    if (loading) return;

    const saveData = async () => {
      try {
        // Guardar localmente
        await window.storage.set('bs12-tx', JSON.stringify(tx));
        await window.storage.set('bs12-cli', JSON.stringify(cli));
        await window.storage.set('bs12-prov', JSON.stringify(prov));
        await window.storage.set('bs12-emp', JSON.stringify(emp));
        await window.storage.set('bs12-leads', JSON.stringify(leads));
        await window.storage.set('bs12-fact', JSON.stringify(fact));
        await window.storage.set('bs12-juntas', JSON.stringify(juntas));
        await window.storage.set('bs12-cfg', JSON.stringify(cfg));

        // Sincronizar con la nube si está habilitado
        if (syncEnabled && isAuthenticated) {
          saveToCloudDebounced(allData);
        }
      } catch (e) {
        console.log('Save error');
      }
    };

    const timer = setTimeout(saveData, 500);
    return () => clearTimeout(timer);
  }, [tx, cli, prov, emp, leads, fact, juntas, cfg, loading, syncEnabled, isAuthenticated, allData, saveToCloudDebounced]);

  // Sincronizar cuando el usuario inicie sesión
  useEffect(() => {
    if (isAuthenticated && user?.uid && !loading) {
      // Intentar cargar datos de la nube al iniciar sesión
      const syncOnLogin = async () => {
        try {
          const cloudData = await loadFromCloud();
          if (cloudData) {
            handleCloudDataUpdate(cloudData);
            notify('Datos sincronizados desde la nube');
          }
        } catch (e) {
          console.log('Error syncing on login:', e);
        }
      };
      syncOnLogin();
    }
  }, [isAuthenticated, user?.uid, loading]);

  const notify = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 2500);
  };

  const obtenerPrecioPlan = (planId) => PLANES.find(p => p.id === planId)?.precio || 0;

  const moverLeadEstado = (leadId, nuevoEstado) => {
    setLeads(prev => {
      const leadActual = prev.find(l => l.id === leadId);
      if (!leadActual || leadActual.estado === nuevoEstado) {
        return prev;
      }
      return prev.map(l => l.id === leadId ? { ...l, estado: nuevoEstado } : l);
    });
    const nombreEstado = EST_LEAD.find(e => e.id === nuevoEstado)?.nombre || nuevoEstado;
    notify(`Lead movido a ${nombreEstado}`);
  };

  const convertirLeadRapido = (lead) => {
    if (!lead) return;
    if (!lead.venue && !lead.contacto) {
      notify('Completa nombre del venue o contacto', 'error');
      return;
    }

    const nuevoCliente = {
      id: Date.now(),
      nombre: lead.venue || lead.contacto,
      rfc: '',
      email: lead.email || '',
      tel: lead.tel || '',
      notas: `Convertido de lead. Plan: ${PLANES.find(p => p.id === lead.plan)?.nombre}`
    };

    setCli(prev => [nuevoCliente, ...prev]);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, estado: 'cerrado' } : l));
    notify('¡Convertido a cliente!');
  };

  const handleLeadDragStart = (event, leadId) => {
    setDraggingLeadId(leadId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(leadId));
  };

  const handleLeadDragEnd = () => {
    setDraggingLeadId(null);
    setDragOverEstado(null);
  };

  const handleLeadDrop = (event, estado) => {
    event.preventDefault();
    const draggedId = draggingLeadId || Number(event.dataTransfer.getData('text/plain'));
    if (!draggedId) return;
    moverLeadEstado(draggedId, estado);
    setDraggingLeadId(null);
    setDragOverEstado(null);
  };

  const renderCellValue = (column, row) => {
    const raw = row[column.key];
    const value = column.format ? column.format(raw) : raw;
    if (value === undefined || value === null || value === '') {
      return '-';
    }
    return value;
  };

  const handleNav = (id) => {
    setTab(id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // ========== FILTRO DE TRANSACCIONES ==========
  const txFiltradas = useMemo(() => {
    return tx.filter(t => {
      const fecha = new Date(t.fecha);
      const matchAño = fecha.getFullYear() === año;
      const matchMes = mes === 0 || (fecha.getMonth() + 1) === mes;
      return matchAño && matchMes;
    });
  }, [tx, año, mes]);

  // ========== CALCULOS ==========
  const totales = useMemo(() => {
    let ing = 0, egr = 0, efectivo = 0, banco = 0, xCobrar = 0, xPagar = 0;
    
    txFiltradas.forEach(t => {
      const m = Number(t.monto) || 0;
      if (t.tipo === 'Ingreso') {
        ing += m;
        if (t.caja === 'Efectivo') efectivo += m;
        else if (t.caja === 'Banco') banco += m;
        else if (t.caja === 'Por cobrar') xCobrar += m;
      } else {
        egr += m;
        if (t.caja === 'Efectivo') efectivo -= m;
        else if (t.caja === 'Banco') banco -= m;
        else if (t.caja === 'Por pagar') xPagar += m;
      }
    });
    
    return { ing, egr, balance: ing - egr, efectivo, banco, xCobrar, xPagar };
  }, [txFiltradas]);

  const totalesGlobales = useMemo(() => {
    let ing = 0, egr = 0;
    tx.filter(t => new Date(t.fecha).getFullYear() === año).forEach(t => {
      const m = Number(t.monto) || 0;
      if (t.tipo === 'Ingreso') ing += m;
      else egr += m;
    });
    return { ing, egr, balance: ing - egr };
  }, [tx, año]);

  const analisisCategorias = useMemo(() => {
    const ingresos = {};
    const egresos = {};
    
    CAT_ING.forEach(c => ingresos[c] = 0);
    CAT_EGR.forEach(c => egresos[c] = 0);
    
    txFiltradas.forEach(t => {
      const m = Number(t.monto) || 0;
      if (t.tipo === 'Ingreso' && t.cat) {
        ingresos[t.cat] = (ingresos[t.cat] || 0) + m;
      } else if (t.tipo === 'Egreso' && t.cat) {
        egresos[t.cat] = (egresos[t.cat] || 0) + m;
      }
    });
    
    return { ingresos, egresos };
  }, [txFiltradas]);

  const analisisMensual = useMemo(() => {
    const meses = Array(12).fill(null).map(() => ({ ing: 0, egr: 0 }));
    
    tx.forEach(t => {
      const fecha = new Date(t.fecha);
      if (fecha.getFullYear() === año) {
        const mesIdx = fecha.getMonth();
        const m = Number(t.monto) || 0;
        if (t.tipo === 'Ingreso') {
          meses[mesIdx].ing += m;
        } else {
          meses[mesIdx].egr += m;
        }
      }
    });
    
    return meses;
  }, [tx, año]);

  const metricas = useMemo(() => {
    const margenBruto = totales.ing > 0 ? ((totales.balance / totales.ing) * 100) : 0;
    const roi = totales.egr > 0 ? ((totales.balance / totales.egr) * 100) : 0;
    const liquidez = totales.efectivo + totales.banco;
    const capitalTrabajo = liquidez + totales.xCobrar - totales.xPagar;
    const promedioIngreso = txFiltradas.filter(t => t.tipo === 'Ingreso').length > 0 
      ? totales.ing / txFiltradas.filter(t => t.tipo === 'Ingreso').length : 0;
    const promedioEgreso = txFiltradas.filter(t => t.tipo === 'Egreso').length > 0 
      ? totales.egr / txFiltradas.filter(t => t.tipo === 'Egreso').length : 0;
    
    const mesesConDatos = analisisMensual.filter(m => m.ing > 0 || m.egr > 0).length || 1;
    const promedioMensualIng = totalesGlobales.ing / mesesConDatos;
    const promedioMensualEgr = totalesGlobales.egr / mesesConDatos;
    const proyeccionAnual = (promedioMensualIng - promedioMensualEgr) * 12;
    
    return { margenBruto, roi, liquidez, capitalTrabajo, promedioIngreso, promedioEgreso, promedioMensualIng, promedioMensualEgr, proyeccionAnual };
  }, [totales, totalesGlobales, txFiltradas, analisisMensual]);

  const crmStats = useMemo(() => {
    const nuevo = leads.filter(l => l.estado === 'nuevo').length;
    const contactado = leads.filter(l => l.estado === 'contactado').length;
    const interesado = leads.filter(l => l.estado === 'interesado').length;
    const negociacion = leads.filter(l => l.estado === 'negociacion').length;
    const cerrado = leads.filter(l => l.estado === 'cerrado').length;
    const perdido = leads.filter(l => l.estado === 'perdido').length;
    const proceso = contactado + interesado + negociacion;
    const potencial = leads.filter(l => !['cerrado', 'perdido'].includes(l.estado))
      .reduce((sum, l) => sum + (PLANES.find(p => p.id === l.plan)?.precio || 0), 0);
    const conversion = (cerrado + perdido) > 0 ? (cerrado / (cerrado + perdido)) * 100 : 0;
    
    return { total: leads.length, nuevo, contactado, interesado, negociacion, proceso, cerrado, perdido, potencial, conversion };
  }, [leads]);

  const factFiltradas = useMemo(() => {
    return fact.filter(f => {
      const fecha = new Date(f.fecha);
      const matchAño = fecha.getFullYear() === año;
      const matchMes = mes === 0 || (fecha.getMonth() + 1) === mes;
      return matchAño && matchMes;
    });
  }, [fact, año, mes]);

  const factStats = useMemo(() => ({
    total: factFiltradas.length,
    pendiente: factFiltradas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + (f.total || 0), 0),
    pagada: factFiltradas.filter(f => f.estado === 'pagada').reduce((s, f) => s + (f.total || 0), 0),
  }), [factFiltradas]);

  const juntasProximas = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    return juntas
      .filter(j => j.fecha >= hoy && j.estado !== 'cancelada')
      .sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora))
      .slice(0, 5);
  }, [juntas]);

  const databaseSections = useMemo(() => ([
    {
      id: 'tx',
      title: 'Transacciones',
      description: 'Ingresos y egresos registrados',
      columns: [
        { key: 'fecha', label: 'Fecha' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'cat', label: 'Categoría' },
        { key: 'concepto', label: 'Concepto' },
        { key: 'caja', label: 'Caja' },
        { key: 'monto', label: 'Monto', format: value => fmt(value) },
      ],
      rows: tx,
    },
    {
      id: 'cli',
      title: 'Clientes',
      description: 'Clientes registrados en el sistema',
      columns: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'rfc', label: 'RFC' },
        { key: 'email', label: 'Email' },
        { key: 'tel', label: 'Teléfono' },
        { key: 'notas', label: 'Notas' },
      ],
      rows: cli,
    },
    {
      id: 'prov',
      title: 'Proveedores',
      description: 'Directorio de proveedores',
      columns: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'rfc', label: 'RFC' },
        { key: 'email', label: 'Email' },
        { key: 'tel', label: 'Teléfono' },
        { key: 'banco', label: 'Banco' },
        { key: 'cuenta', label: 'Cuenta' },
      ],
      rows: prov,
    },
    {
      id: 'emp',
      title: 'Empleados',
      description: 'Equipo y nómina',
      columns: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'puesto', label: 'Puesto' },
        { key: 'salario', label: 'Salario', format: value => fmt(value) },
        { key: 'fecha', label: 'Fecha de ingreso' },
        { key: 'rfc', label: 'RFC' },
      ],
      rows: emp,
    },
    {
      id: 'leads',
      title: 'Leads',
      description: 'Prospectos cargados en CRM',
      columns: [
        { key: 'venue', label: 'Venue' },
        { key: 'contacto', label: 'Contacto' },
        { key: 'estado', label: 'Estado' },
        { key: 'plan', label: 'Plan' },
        { key: 'fuente', label: 'Fuente' },
        { key: 'fecha', label: 'Fecha' },
      ],
      rows: leads,
    },
    {
      id: 'fact',
      title: 'Facturas',
      description: 'Facturación emitida',
      columns: [
        { key: 'num', label: 'Folio' },
        { key: 'clienteNom', label: 'Cliente' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'estado', label: 'Estado' },
        { key: 'total', label: 'Total', format: value => fmt(value) },
      ],
      rows: fact,
    },
    {
      id: 'juntas',
      title: 'Juntas',
      description: 'Agenda de reuniones',
      columns: [
        { key: 'leadNombre', label: 'Lead' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'hora', label: 'Hora' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'estado', label: 'Estado' },
        { key: 'lugar', label: 'Lugar' },
      ],
      rows: juntas,
    },
  ]), [tx, cli, prov, emp, leads, fact, juntas]);

  // ========== FUNCIONES MODAL ==========
  const abrirModal = (tipo, datos) => {
    setModalType(tipo);
    setEditData({ ...datos });
    setModalOpen(true);
    setConfirmDelete(false);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setModalType(null);
    setEditData(null);
    setConfirmDelete(false);
  };

  const guardarYCerrar = () => {
    if (!editData) return;

    switch (modalType) {
      case 'lead':
        setLeads(prev => prev.map(l => l.id === editData.id ? editData : l));
        logLead('update', editData);
        break;
      case 'cli':
        setCli(prev => prev.map(c => c.id === editData.id ? editData : c));
        logClient('update', editData);
        break;
      case 'prov':
        setProv(prev => prev.map(p => p.id === editData.id ? editData : p));
        logProvider('update', editData);
        break;
      case 'emp':
        setEmp(prev => prev.map(e => e.id === editData.id ? editData : e));
        logEmployee('update', editData);
        break;
      case 'fact':
        setFact(prev => prev.map(f => f.id === editData.id ? editData : f));
        logInvoice('update', editData);
        break;
      case 'junta':
        setJuntas(prev => prev.map(j => j.id === editData.id ? editData : j));
        logMeeting('update', editData);
        break;
    }
    cerrarModal();
    notify('Guardado correctamente');
  };

  const cambiarCampo = (campo, valor) => {
    setEditData(prev => ({ ...prev, [campo]: valor }));
  };

  const ejecutarEliminacion = () => {
    if (!editData) return;

    switch (modalType) {
      case 'lead':
        setLeads(prev => prev.filter(l => l.id !== editData.id));
        setJuntas(prev => prev.filter(j => j.leadId !== editData.id));
        logLead('delete', editData);
        notify('Lead eliminado');
        break;
      case 'cli':
        setCli(prev => prev.filter(c => c.id !== editData.id));
        logClient('delete', editData);
        notify('Cliente eliminado');
        break;
      case 'prov':
        setProv(prev => prev.filter(p => p.id !== editData.id));
        logProvider('delete', editData);
        notify('Proveedor eliminado');
        break;
      case 'emp':
        setEmp(prev => prev.filter(e => e.id !== editData.id));
        logEmployee('delete', editData);
        notify('Empleado eliminado');
        break;
      case 'fact':
        setFact(prev => prev.filter(f => f.id !== editData.id));
        logInvoice('delete', editData);
        notify('Factura eliminada');
        break;
      case 'junta':
        setJuntas(prev => prev.filter(j => j.id !== editData.id));
        logMeeting('delete', editData);
        notify('Junta eliminada');
        break;
    }
    cerrarModal();
  };

  // ========== CRUD ==========
  const agregarTx = () => {
    const nueva = {
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'Ingreso',
      cat: '',
      concepto: '',
      notas: '',
      caja: 'Efectivo',
      monto: ''
    };
    setTx(prev => [nueva, ...prev]);
    logTransaction('create', nueva);
    notify('Registro agregado');
  };

  const actualizarTx = (id, campo, valor) => {
    setTx(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, [campo]: valor };
        if (campo === 'monto' || campo === 'concepto') {
          logTransaction('update', updated);
        }
        return updated;
      }
      return t;
    }));
  };

  const eliminarTx = (id) => {
    const txToDelete = tx.find(t => t.id === id);
    if (txToDelete) {
      logTransaction('delete', txToDelete);
    }
    setTx(prev => prev.filter(t => t.id !== id));
    notify('Registro eliminado');
  };

  const agregarLead = () => {
    const nuevo = {
      id: Date.now(),
      fecha: new Date().toISOString().split('T')[0],
      contacto: '',
      tel: '',
      email: '',
      venue: '',
      tipo: 'Salón',
      ciudad: '',
      estado: 'nuevo',
      plan: 'basico',
      fuente: 'Google',
      notas: ''
    };
    setLeads(prev => [nuevo, ...prev]);
    logLead('create', nuevo);
    abrirModal('lead', nuevo);
    notify('Lead creado');
  };

  const convertirLead = () => {
    if (!editData) return;
    if (!editData.venue && !editData.contacto) {
      notify('Completa nombre del venue o contacto', 'error');
      return;
    }

    const nuevoCliente = {
      id: Date.now(),
      nombre: editData.venue || editData.contacto,
      rfc: '',
      email: editData.email || '',
      tel: editData.tel || '',
      notas: `Convertido de lead. Plan: ${PLANES.find(p => p.id === editData.plan)?.nombre}`
    };

    setCli(prev => [nuevoCliente, ...prev]);
    setLeads(prev => prev.map(l => l.id === editData.id ? { ...l, estado: 'cerrado' } : l));
    logLead('status_change', { ...editData, estado: 'cerrado' }, editData.estado);
    logClient('create', nuevoCliente);
    cerrarModal();
    notify('¡Convertido a cliente!');
  };

  const agregarJunta = (leadId = null) => {
    const lead = leadId ? leads.find(l => l.id === leadId) : null;
    const nueva = {
      id: Date.now(),
      leadId: leadId || '',
      leadNombre: lead ? (lead.venue || lead.contacto) : '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '10:00',
      duracion: '60',
      lugar: '',
      tipo: 'presencial',
      notas: '',
      estado: 'pendiente'
    };
    setJuntas(prev => [nueva, ...prev]);
    logMeeting('create', nueva);
    abrirModal('junta', nueva);
    notify('Junta programada');
  };

  const agregarCliente = () => {
    const nuevo = { id: Date.now(), nombre: '', rfc: '', email: '', tel: '', notas: '' };
    setCli(prev => [nuevo, ...prev]);
    logClient('create', nuevo);
    abrirModal('cli', nuevo);
    notify('Cliente creado');
  };

  const agregarProveedor = () => {
    const nuevo = { id: Date.now(), nombre: '', rfc: '', email: '', tel: '', banco: '', cuenta: '' };
    setProv(prev => [nuevo, ...prev]);
    logProvider('create', nuevo);
    abrirModal('prov', nuevo);
    notify('Proveedor creado');
  };

  const agregarEmpleado = () => {
    const nuevo = { id: Date.now(), nombre: '', rfc: '', puesto: '', salario: '', fecha: new Date().toISOString().split('T')[0] };
    setEmp(prev => [nuevo, ...prev]);
    logEmployee('create', nuevo);
    abrirModal('emp', nuevo);
    notify('Empleado creado');
  };

  const calcularTotales = (items) => {
    const sub = items.reduce((s, i) => s + (Number(i.c) || 0) * (Number(i.p) || 0), 0);
    return { sub, iva: sub * 0.16, total: sub * 1.16 };
  };

  const agregarFactura = () => {
    const nueva = {
      id: Date.now(),
      num: `F-${String(fact.length + 1).padStart(4, '0')}`,
      fecha: new Date().toISOString().split('T')[0],
      vence: '',
      clienteId: '',
      clienteNom: '',
      estado: 'borrador',
      items: [{ d: '', c: 1, p: 0 }],
      sub: 0,
      iva: 0,
      total: 0,
      notas: ''
    };
    setFact(prev => [nueva, ...prev]);
    logInvoice('create', nueva);
    abrirModal('fact', nueva);
    notify('Factura creada');
  };

  const actualizarItemFactura = (idx, campo, valor) => {
    const newItems = editData.items.map((item, i) => i === idx ? { ...item, [campo]: valor } : item);
    const totales = calcularTotales(newItems);
    setEditData(prev => ({ ...prev, items: newItems, ...totales }));
  };

  const agregarItemFactura = () => {
    const newItems = [...editData.items, { d: '', c: 1, p: 0 }];
    setEditData(prev => ({ ...prev, items: newItems }));
  };

  const eliminarItemFactura = (idx) => {
    if (editData.items.length <= 1) return;
    const newItems = editData.items.filter((_, i) => i !== idx);
    const totales = calcularTotales(newItems);
    setEditData(prev => ({ ...prev, items: newItems, ...totales }));
  };

  const imprimirFactura = () => {
    if (!editData) return;
    const f = editData;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>${f.num}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body{font-family:'Plus Jakarta Sans',system-ui;padding:40px;max-width:800px;margin:auto;color:#2a1d89}
        .header{display:flex;justify-content:space-between;border-bottom:3px solid #4f67eb;padding-bottom:20px;margin-bottom:30px}
        h1{color:#2a1d89;margin:0}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #b7bac3}
        th{background:#f8f9fc;color:#2a1d89}
        .r{text-align:right}
        .total{font-size:24px;color:#4f67eb;font-weight:bold}
      </style></head><body>
      <div class="header"><div><h1>${cfg.empresa}</h1><p>${cfg.rfc || ''}</p></div>
      <div style="text-align:right"><h2 style="color:#4f67eb">${f.num}</h2><p>${new Date(f.fecha).toLocaleDateString('es-MX')}</p></div></div>
      <p><strong>Cliente:</strong> ${f.clienteNom || 'No especificado'}</p>
      <table><tr><th>Descripción</th><th>Cant</th><th class="r">Precio</th><th class="r">Total</th></tr>
      ${f.items.map(i => `<tr><td>${i.d||'-'}</td><td>${i.c}</td><td class="r">${fmt(i.p)}</td><td class="r">${fmt(i.c*i.p)}</td></tr>`).join('')}
      </table>
      <div style="text-align:right"><p>Subtotal: ${fmt(f.sub)}</p><p>IVA: ${fmt(f.iva)}</p><p class="total">Total: ${fmt(f.total)}</p></div>
      <script>window.onload=()=>window.print()</script></body></html>
    `);
  };

  // ========== EXPORTACIÓN ==========
  const descargarArchivo = (blob, nombreArchivo) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportarArchivo = useCallback((data, nombre, headers, mapFn, formato = 'csv') => {
    if (!data || data.length === 0) {
      notify('No hay datos para exportar', 'error');
      return;
    }
    
    try {
      const fechaExport = new Date().toISOString().split('T')[0];
      const periodoStr = mes > 0 ? `${MESES[mes-1]}-${año}` : año;
      let blob;
      let extension = 'csv';

      if (formato === 'json') {
        extension = 'json';
        const payload = {
          nombre,
          periodo: periodoStr,
          exportadoEn: new Date().toISOString(),
          headers,
          rows: data.map(item => mapFn(item)),
        };
        const jsonContent = JSON.stringify(payload, null, 2);
        blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      } else {
        const BOM = '\uFEFF';
        const csvRows = [headers];

        data.forEach(item => {
          const row = mapFn(item);
          csvRows.push(row);
        });

        const csvContent = BOM + csvRows.map(row => {
          if (Array.isArray(row)) {
            return row.map(cell => {
              const cellStr = String(cell ?? '');
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            }).join(',');
          }
          return row;
        }).join('\r\n');

        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      }

      descargarArchivo(blob, `${nombre}_${periodoStr}_${fechaExport}.${extension}`);
      
      notify(`${data.length} registros exportados`);
    } catch (error) {
      notify('Error al exportar', 'error');
    }
  }, [mes, año]);

  const exportarTransacciones = (formato = 'csv') => {
    exportarArchivo(txFiltradas, 'Transacciones', ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Notas', 'Caja', 'Monto'],
      t => [t.fecha, t.tipo, t.cat || '', t.concepto || '', t.notas || '', t.caja, Number(t.monto) || 0], formato);
  };

  const exportarFacturas = (formato = 'csv') => {
    exportarArchivo(factFiltradas, 'Facturas', ['Número', 'Fecha', 'Cliente', 'Estado', 'Total'],
      f => [f.num, f.fecha, f.clienteNom || '', f.estado, f.total || 0], formato);
  };

  const exportarLeads = (formato = 'csv') => {
    exportarArchivo(leads, 'Leads', ['Fecha', 'Contacto', 'Venue', 'Email', 'Estado', 'Plan'],
      l => [l.fecha, l.contacto || '', l.venue || '', l.email || '', l.estado, PLANES.find(p => p.id === l.plan)?.nombre || ''], formato);
  };

  const exportarClientes = (formato = 'csv') => {
    exportarArchivo(cli, 'Clientes', ['Nombre', 'RFC', 'Email', 'Teléfono'],
      c => [c.nombre || '', c.rfc || '', c.email || '', c.tel || ''], formato);
  };

  const exportarRespaldo = () => {
    const fechaExport = new Date().toISOString().split('T')[0];
    const payload = {
      exportadoEn: new Date().toISOString(),
      empresa: cfg.empresa,
      data: {
        transacciones: tx,
        clientes: cli,
        proveedores: prov,
        empleados: emp,
        leads,
        facturas: fact,
        juntas,
        configuracion: cfg,
      },
    };
    const jsonContent = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    descargarArchivo(blob, `Respaldo_Bookspace_${fechaExport}.json`);
    notify('Respaldo completo exportado');
  };

  const leadsFiltrados = useMemo(() => {
    return leads.filter(l => {
      const matchTexto = !filtro || 
        l.contacto?.toLowerCase().includes(filtro.toLowerCase()) || 
        l.venue?.toLowerCase().includes(filtro.toLowerCase()) ||
        l.ciudad?.toLowerCase().includes(filtro.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || l.estado === filtroEstado;
      return matchTexto && matchEstado;
    });
  }, [leads, filtro, filtroEstado]);

  const leadsPorEstado = useMemo(() => {
    const grouped = EST_LEAD.reduce((acc, estado) => {
      acc[estado.id] = [];
      return acc;
    }, {});
    leadsFiltrados.forEach(lead => {
      if (grouped[lead.estado]) {
        grouped[lead.estado].push(lead);
      }
    });
    return grouped;
  }, [leadsFiltrados]);

  const pipelineTotales = useMemo(() => {
    const totales = EST_LEAD.reduce((acc, estado) => {
      acc[estado.id] = { count: 0, valor: 0 };
      return acc;
    }, {});
    leadsFiltrados.forEach(lead => {
      if (!totales[lead.estado]) return;
      totales[lead.estado].count += 1;
      totales[lead.estado].valor += obtenerPrecioPlan(lead.plan);
    });
    return totales;
  }, [leadsFiltrados]);

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#4f67eb] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#2a1d89] font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Progress Bar
  const ProgressBar = ({ value, max, color = 'primary' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const colors = {
      primary: 'bg-[#4f67eb]',
      success: 'bg-emerald-500',
      danger: 'bg-red-500',
      warning: 'bg-amber-500'
    };
    return (
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${colors[color]} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
      </div>
    );
  };

  const ExportMenu = ({ onCsv, onJson, label = 'Exportar' }) => (
    <details className="relative">
      <summary className="list-none">
        <span className="px-4 py-2.5 border border-gray-200 text-[#2a1d89] rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2 cursor-pointer">
          <Download className="w-4 h-4" />{label}
          <ChevronDown className="w-4 h-4 text-[#b7bac3]" />
        </span>
      </summary>
      <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-10 p-2">
        <button
          type="button"
          onClick={(event) => {
            onCsv();
            const details = event.currentTarget.closest('details');
            if (details) details.removeAttribute('open');
          }}
          className="w-full px-3 py-2 rounded-lg text-left text-sm text-[#2a1d89] hover:bg-[#f8f9fc] flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#4f67eb]" />CSV (Excel)
        </button>
        <button
          type="button"
          onClick={(event) => {
            onJson();
            const details = event.currentTarget.closest('details');
            if (details) details.removeAttribute('open');
          }}
          className="w-full px-3 py-2 rounded-lg text-left text-sm text-[#2a1d89] hover:bg-[#f8f9fc] flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-[#4f67eb]" />JSON (API)
        </button>
      </div>
    </details>
  );

  // Stat Card Component
  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary', trend }) => {
    const colorClasses = {
      primary: 'border-l-[#4f67eb]',
      success: 'border-l-emerald-500',
      warning: 'border-l-amber-500',
      danger: 'border-l-red-500'
    };
    const iconColors = {
      primary: 'text-[#4f67eb] bg-[#4f67eb]/10',
      success: 'text-emerald-600 bg-emerald-50',
      warning: 'text-amber-600 bg-amber-50',
      danger: 'text-red-600 bg-red-50'
    };
    return (
      <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 ${colorClasses[color]}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[#b7bac3] text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-[#2a1d89] mt-1">{value}</p>
            {subtitle && (
              <p className={`text-sm mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-[#b7bac3]'}`}>
                {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={`p-3 rounded-xl ${iconColors[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Navigation Items
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'crm', icon: Target, label: 'CRM' },
    { id: 'facturas', icon: FileText, label: 'Facturas' },
    { id: 'registros', icon: Receipt, label: 'Registros' },
    { id: 'database', icon: Database, label: 'Base de datos' },
    { id: 'contactos', icon: Users, label: 'Contactos' },
    { id: 'finanzas', icon: BarChart3, label: 'Finanzas' },
    { id: 'bitacora', icon: Activity, label: 'Bitácora' },
    { id: 'config', icon: Settings, label: 'Configuración' },
  ];

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-[#f8f9fc] flex" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      {/* Notification */}
      {msg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in ${msg.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#2a1d89] text-white'}`}>
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-100 flex flex-col transition-all duration-300 fixed h-full z-30 w-64 ${sidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-20'} md:translate-x-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <BookspaceLogo size={40} />
          {sidebarOpen && <span className="font-bold text-[#2a1d89] text-lg">bookspace</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === item.id 
                  ? 'bg-[#4f67eb] text-white shadow-md shadow-[#4f67eb]/20' 
                  : 'text-[#2a1d89] hover:bg-[#4f67eb]/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#b7bac3] hover:text-[#2a1d89] transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          aria-label="Cerrar menú"
        />
      )}

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 px-4 md:px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl border border-gray-100 text-[#2a1d89] hover:bg-[#f8f9fc]"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[#2a1d89]">{navItems.find(n => n.id === tab)?.label}</h1>
                <p className="text-sm text-[#b7bac3]">
                  {mes > 0 ? `${MESES_COMPLETOS[mes-1]} ${año}` : `Todo ${año}`}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
              {/* Period Filter */}
              <div className="flex flex-wrap items-center gap-2 bg-[#f8f9fc] px-3 py-2 rounded-xl">
                <CalendarDays className="w-4 h-4 text-[#4f67eb]" />
                <select 
                  value={año} 
                  onChange={e => setAño(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium text-[#2a1d89] outline-none cursor-pointer"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select 
                  value={mes} 
                  onChange={e => setMes(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium text-[#2a1d89] outline-none cursor-pointer"
                >
                  <option value={0}>Todos</option>
                  {MESES_COMPLETOS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b7bac3]" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="bg-[#f8f9fc] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm w-full md:w-48 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#b7bac3] bg-white px-1.5 py-0.5 rounded">⌘K</span>
              </div>

              {/* Notifications */}
              <button className="relative p-2.5 text-[#b7bac3] hover:text-[#2a1d89] hover:bg-[#f8f9fc] rounded-xl transition">
                <Bell className="w-5 h-5" />
                {juntasProximas.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#4f67eb] rounded-full"></span>
                )}
              </button>

              {/* Sync Status */}
              {isAuthenticated && (
                <SyncIndicator
                  status={syncStatus}
                  lastSyncTime={lastSyncTime}
                  error={syncError}
                  onRetry={syncWithCloud}
                />
              )}

              {/* Profile / User Menu */}
              <UserMenu
                user={user}
                isAuthenticated={isAuthenticated}
                syncStatus={syncStatus}
                onLogin={() => setAuthModalOpen(true)}
                onLogout={async () => {
                  const result = await logout();
                  if (result.success) {
                    notify('Sesión cerrada');
                  }
                }}
                companyName={cfg.empresa}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          
          {/* ===== DASHBOARD ===== */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Ingresos" 
                  value={fmt(totales.ing)} 
                  subtitle={`${txFiltradas.filter(t => t.tipo === 'Ingreso').length} transacciones`}
                  icon={ArrowUpRight} 
                  color="success" 
                  trend="up"
                />
                <StatCard 
                  title="Total Egresos" 
                  value={fmt(totales.egr)} 
                  subtitle={`${txFiltradas.filter(t => t.tipo === 'Egreso').length} transacciones`}
                  icon={ArrowDownRight} 
                  color="danger" 
                  trend="down"
                />
                <StatCard 
                  title="Leads Activos" 
                  value={crmStats.proceso} 
                  subtitle={`${fmt(crmStats.potencial)}/mes potencial`}
                  icon={Target} 
                  color="primary" 
                />
                <StatCard 
                  title="Por Cobrar" 
                  value={fmt(factStats.pendiente)} 
                  subtitle={`${factFiltradas.filter(f => f.estado === 'pendiente').length} facturas`}
                  icon={FileText} 
                  color="warning" 
                />
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[#2a1d89]">Flujo Mensual {año}</h3>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-2"><span className="w-3 h-3 bg-[#4f67eb] rounded"></span>Ingresos</span>
                      <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-400 rounded"></span>Egresos</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    {analisisMensual.map((m, i) => {
                      const maxVal = Math.max(...analisisMensual.map(x => Math.max(x.ing, x.egr))) || 1;
                      const hIng = m.ing > 0 ? Math.max((m.ing / maxVal) * 120, 4) : 0;
                      const hEgr = m.egr > 0 ? Math.max((m.egr / maxVal) * 120, 4) : 0;
                      const isSelected = mes === i + 1;
                      return (
                        <div 
                          key={i} 
                          className={`text-center cursor-pointer rounded-xl p-2 transition-all ${isSelected ? 'bg-[#4f67eb]/10 ring-2 ring-[#4f67eb]' : 'hover:bg-gray-50'}`}
                          onClick={() => setMes(mes === i + 1 ? 0 : i + 1)}
                        >
                          <div className="h-32 flex items-end justify-center gap-1 mb-2">
                            <div className="w-3 bg-[#4f67eb] rounded-t transition-all" style={{ height: `${hIng}px` }}></div>
                            <div className="w-3 bg-red-400 rounded-t transition-all" style={{ height: `${hEgr}px` }}></div>
                          </div>
                          <p className={`text-xs font-medium ${isSelected ? 'text-[#4f67eb]' : 'text-[#b7bac3]'}`}>{MESES[i]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Meetings */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-[#2a1d89]">Próximas Juntas</h3>
                    <button onClick={() => agregarJunta()} className="text-[#4f67eb] text-sm font-medium hover:underline">+ Nueva</button>
                  </div>
                  {juntasProximas.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto text-[#b7bac3] mb-3" />
                      <p className="text-[#b7bac3] text-sm">Sin juntas programadas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {juntasProximas.map(j => (
                        <div key={j.id} onClick={() => abrirModal('junta', j)} className="flex items-center gap-3 p-3 bg-[#f8f9fc] rounded-xl cursor-pointer hover:bg-[#4f67eb]/5 transition">
                          <div className="w-10 h-10 bg-[#4f67eb] rounded-xl flex items-center justify-center text-white">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#2a1d89] truncate">{j.leadNombre || 'Sin asignar'}</p>
                            <p className="text-xs text-[#b7bac3]">{new Date(j.fecha).toLocaleDateString('es-MX')} • {j.hora}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${j.tipo === 'presencial' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {j.tipo}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline CRM */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-[#2a1d89] mb-4">Pipeline de Ventas</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {EST_LEAD.map(e => {
                    const count = leads.filter(l => l.estado === e.id).length;
                    return (
                      <div key={e.id} className={`rounded-xl p-4 text-center border ${e.cl}`}>
                        <p className="text-3xl font-bold">{count}</p>
                        <p className="text-sm mt-1">{e.nombre}</p>
                      </div>
                    );
                  })}
                </div>
                {crmStats.conversion > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-[#2a1d89]">Tasa de conversión: <strong>{crmStats.conversion.toFixed(1)}%</strong></span>
                  </div>
                )}
              </div>

              {/* Activity Widget & Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                    <Wallet className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-lg font-bold text-[#2a1d89]">{fmt(totales.efectivo)}</p>
                    <p className="text-sm text-[#b7bac3]">Efectivo</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                    <Building className="w-6 h-6 mx-auto mb-2 text-[#4f67eb]" />
                    <p className="text-lg font-bold text-[#2a1d89]">{fmt(totales.banco)}</p>
                    <p className="text-sm text-[#b7bac3]">Banco</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                    <CreditCard className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                    <p className="text-lg font-bold text-[#2a1d89]">{fmt(totales.xCobrar)}</p>
                    <p className="text-sm text-[#b7bac3]">Por Cobrar</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                    <PiggyBank className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <p className="text-lg font-bold text-[#2a1d89]">{fmt(totales.xPagar)}</p>
                    <p className="text-sm text-[#b7bac3]">Por Pagar</p>
                  </div>
                </div>

                {/* Recent Activity Widget */}
                <ActivityWidget
                  activities={activities}
                  loading={activityLoading}
                  maxItems={5}
                  onViewAll={() => setTab('bitacora')}
                />
              </div>
            </div>
          )}

          {/* ===== CRM ===== */}
          {tab === 'crm' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <p className="text-[#b7bac3] text-sm">{leads.length} leads total • {crmStats.proceso} en proceso</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setCrmView('pipeline')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${crmView === 'pipeline' ? 'bg-[#4f67eb] text-white' : 'text-[#2a1d89] hover:bg-gray-50'}`}
                    >
                      <Activity className="w-4 h-4" />Pipeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrmView('cards')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${crmView === 'cards' ? 'bg-[#4f67eb] text-white' : 'text-[#2a1d89] hover:bg-gray-50'}`}
                    >
                      <Menu className="w-4 h-4" />Tarjetas
                    </button>
                  </div>
                  <ExportMenu onCsv={() => exportarLeads('csv')} onJson={() => exportarLeads('json')} />
                  <button onClick={agregarLead} className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20">
                    <Plus className="w-4 h-4" />Nuevo Lead
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="Nuevos" value={crmStats.nuevo} color="primary" />
                <StatCard title="En Proceso" value={crmStats.proceso} color="warning" />
                <StatCard title="Cerrados" value={crmStats.cerrado} color="success" />
                <StatCard title="Potencial/mes" value={fmt(crmStats.potencial)} color="primary" />
                <StatCard title="Conversión" value={`${crmStats.conversion.toFixed(0)}%`} color="success" />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b7bac3]" />
                  <input
                    type="text"
                    placeholder="Buscar lead..."
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none"
                  />
                </div>
                <select
                  value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none"
                >
                  <option value="todos">Todos los estados</option>
                  {EST_LEAD.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              {crmView === 'pipeline' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-[#2a1d89]">Pipeline completo</h4>
                      <p className="text-xs text-[#b7bac3]">Arrastra y suelta los leads para avanzar etapas o actualizarlos al instante.</p>
                    </div>
                    <div className="text-xs text-[#b7bac3] flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Target className="w-3.5 h-3.5 text-[#4f67eb]" />{leadsFiltrados.length} leads filtrados</span>
                      <span className="inline-flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-500" />{fmt(crmStats.potencial)} potencial/mes</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                    {EST_LEAD.map(estado => {
                      const leadsEstado = leadsPorEstado[estado.id] || [];
                      const totalEstado = pipelineTotales[estado.id]?.valor || 0;
                      return (
                        <div
                          key={estado.id}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverEstado(estado.id);
                          }}
                          onDragLeave={() => setDragOverEstado(null)}
                          onDrop={(event) => handleLeadDrop(event, estado.id)}
                          className={`rounded-2xl border p-3 min-h-[240px] transition ${dragOverEstado === estado.id ? 'border-[#4f67eb] bg-[#4f67eb]/5 ring-2 ring-[#4f67eb]/30' : 'border-gray-100 bg-[#f8f9fc]'}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${estado.cl}`}>{estado.nombre}</span>
                            <span className="text-xs text-[#2a1d89] font-semibold">{leadsEstado.length}</span>
                          </div>

                          <div className="space-y-3">
                            {leadsEstado.map(lead => {
                              const juntasPendientes = juntas.filter(j => j.leadId === lead.id && j.estado === 'pendiente');
                              return (
                                <div
                                  key={lead.id}
                                  draggable
                                  onDragStart={(event) => handleLeadDragStart(event, lead.id)}
                                  onDragEnd={handleLeadDragEnd}
                                  onClick={() => abrirModal('lead', lead)}
                                  className={`bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:shadow-md transition ${draggingLeadId === lead.id ? 'opacity-60' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-[#2a1d89] truncate">{lead.venue || lead.contacto || 'Sin nombre'}</p>
                                      <p className="text-xs text-[#b7bac3]">{lead.contacto || 'Sin contacto'}</p>
                                    </div>
                                    <span className="text-[11px] text-[#4f67eb] font-semibold">{PLANES.find(p => p.id === lead.plan)?.nombre}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-[#b7bac3] mt-2">
                                    <span className="bg-gray-100 text-[#2a1d89] px-2 py-0.5 rounded-md">{lead.tipo}</span>
                                    <span>{lead.ciudad || 'Sin ciudad'}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2 text-[11px] text-[#4f67eb]">
                                      <Calendar className="w-3.5 h-3.5" />
                                      {juntasPendientes.length} pendiente{juntasPendientes.length === 1 ? '' : 's'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          agregarJunta(lead.id);
                                        }}
                                        className="text-[11px] text-[#2a1d89] bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition"
                                      >
                                        + Junta
                                      </button>
                                      {lead.estado === 'cerrado' && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            convertirLeadRapido(lead);
                                          }}
                                          className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg hover:bg-emerald-200 transition"
                                        >
                                          Convertir
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {leadsEstado.length === 0 && (
                              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-[#b7bac3]">
                                Arrastra leads aquí
                              </div>
                            )}
                          </div>
                          <div className="mt-3 text-xs text-[#2a1d89] font-semibold flex items-center justify-between">
                            <span>Potencial</span>
                            <span>{fmt(totalEstado)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {crmView === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leadsFiltrados.map(l => {
                    const juntasLead = juntas.filter(j => j.leadId === l.id && j.estado === 'pendiente');
                    return (
                      <div
                        key={l.id}
                        onClick={() => abrirModal('lead', l)}
                        className="bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-[#4f67eb] hover:shadow-lg hover:shadow-[#4f67eb]/5 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-[#2a1d89]">{l.venue || 'Sin venue'}</p>
                            <p className="text-[#b7bac3] text-sm">{l.contacto}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${EST_LEAD.find(e => e.id === l.estado)?.cl}`}>
                            {EST_LEAD.find(e => e.id === l.estado)?.nombre}
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs mb-3">
                          <span className="bg-gray-100 text-[#2a1d89] px-2 py-1 rounded-lg">{l.tipo}</span>
                          <span className="bg-[#4f67eb]/10 text-[#4f67eb] px-2 py-1 rounded-lg font-medium">{PLANES.find(p => p.id === l.plan)?.nombre}</span>
                        </div>
                        {juntasLead.length > 0 && (
                          <div className="flex items-center gap-2 text-[#4f67eb] text-xs pt-3 border-t border-gray-100">
                            <Calendar className="w-3.5 h-3.5" />
                            {juntasLead.length} junta{juntasLead.length > 1 ? 's' : ''} pendiente{juntasLead.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {leadsFiltrados.length === 0 && (
                <div className="text-center py-16">
                  <Target className="w-16 h-16 mx-auto text-[#b7bac3] mb-4" />
                  <p className="text-[#b7bac3]">No hay leads con estos filtros</p>
                </div>
              )}
            </div>
          )}

          {/* ===== FACTURAS ===== */}
          {tab === 'facturas' && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <p className="text-[#b7bac3] text-sm">{factFiltradas.length} facturas en este periodo</p>
                <div className="flex gap-3">
                  <ExportMenu onCsv={() => exportarFacturas('csv')} onJson={() => exportarFacturas('json')} />
                  <button onClick={agregarFactura} className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20">
                    <Plus className="w-4 h-4" />Nueva Factura
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Facturas" value={factStats.total} icon={FileText} color="primary" />
                <StatCard title="Pendiente" value={fmt(factStats.pendiente)} icon={Clock} color="warning" />
                <StatCard title="Cobrado" value={fmt(factStats.pagada)} icon={CheckCircle} color="success" />
                <StatCard title="Total Facturado" value={fmt(factStats.pendiente + factStats.pagada)} icon={DollarSign} color="primary" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {factFiltradas.map(f => (
                  <div key={f.id} onClick={() => abrirModal('fact', f)} className="bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-[#4f67eb] hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-[#4f67eb]">{f.num}</p>
                        <p className="text-[#b7bac3] text-sm">{f.clienteNom || 'Sin cliente'}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${EST_FACT.find(e => e.id === f.estado)?.cl}`}>
                        {EST_FACT.find(e => e.id === f.estado)?.nombre}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="text-[#b7bac3] text-sm">{new Date(f.fecha).toLocaleDateString('es-MX')}</span>
                      <span className="font-bold text-[#2a1d89]">{fmt(f.total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {factFiltradas.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 mx-auto text-[#b7bac3] mb-4" />
                  <p className="text-[#b7bac3]">No hay facturas en este periodo</p>
                </div>
              )}
            </div>
          )}

          {/* ===== REGISTROS ===== */}
          {tab === 'registros' && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <p className="text-[#b7bac3] text-sm">{txFiltradas.length} registros en este periodo</p>
                <div className="flex gap-3">
                  <ExportMenu onCsv={() => exportarTransacciones('csv')} onJson={() => exportarTransacciones('json')} label="Exportar datos" />
                  <button onClick={agregarTx} className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20">
                    <Plus className="w-4 h-4" />Nuevo Registro
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Ingresos" value={fmt(totales.ing)} color="success" />
                <StatCard title="Egresos" value={fmt(totales.egr)} color="danger" />
                <StatCard title="Balance" value={fmt(totales.balance)} color={totales.balance >= 0 ? 'primary' : 'danger'} />
              </div>

              <div className="space-y-4 md:hidden">
                {txFiltradas.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-[#b7bac3]">
                    No hay registros en este periodo
                  </div>
                ) : (
                  txFiltradas.map(t => (
                    <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
                      <div className="flex flex-wrap gap-3">
                        <input type="date" value={t.fecha} onChange={e => actualizarTx(t.id, 'fecha', e.target.value)} className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                        <select value={t.tipo} onChange={e => actualizarTx(t.id, 'tipo', e.target.value)} className={`border rounded-lg px-2 py-1.5 font-medium w-full ${t.tipo === 'Ingreso' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          <option>Ingreso</option>
                          <option>Egreso</option>
                        </select>
                        <select value={t.cat} onChange={e => actualizarTx(t.id, 'cat', e.target.value)} className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:ring-2 focus:ring-[#4f67eb]/20 outline-none">
                          <option value="">Categoría</option>
                          {(t.tipo === 'Ingreso' ? CAT_ING : CAT_EGR).map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <input type="text" value={t.concepto} onChange={e => actualizarTx(t.id, 'concepto', e.target.value)} placeholder="Concepto" className="bg-transparent border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                      <textarea value={t.notas || ''} onChange={e => actualizarTx(t.id, 'notas', e.target.value)} placeholder="Notas" rows={2} className="bg-transparent border border-gray-200 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#4f67eb]/20 outline-none resize-none" />
                      <div className="flex flex-wrap gap-3">
                        <select value={t.caja} onChange={e => actualizarTx(t.id, 'caja', e.target.value)} className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:ring-2 focus:ring-[#4f67eb]/20 outline-none">
                          {CAJAS.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <input type="number" value={t.monto} onChange={e => actualizarTx(t.id, 'monto', e.target.value)} placeholder="0.00" className="bg-transparent border border-gray-200 rounded-lg px-3 py-2 w-full text-right font-medium focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => eliminarTx(t.id)} className="inline-flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f8f9fc] border-b border-gray-100">
                        <th className="px-4 py-4 text-left font-semibold text-[#2a1d89]">Fecha</th>
                        <th className="px-4 py-4 text-left font-semibold text-[#2a1d89]">Tipo</th>
                        <th className="px-4 py-4 text-left font-semibold text-[#2a1d89]">Categoría</th>
                        <th className="px-4 py-4 text-left font-semibold text-[#2a1d89]">Concepto</th>
                        <th className="px-4 py-4 text-left font-semibold text-[#2a1d89]">Notas</th>
                        <th className="px-4 py-4 text-left font-semibold text-[#2a1d89]">Caja</th>
                        <th className="px-4 py-4 text-right font-semibold text-[#2a1d89]">Monto</th>
                        <th className="px-4 py-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {txFiltradas.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-16 text-center text-[#b7bac3]">No hay registros en este periodo</td></tr>
                      ) : (
                        txFiltradas.map(t => (
                          <tr key={t.id} className="border-b border-gray-50 hover:bg-[#f8f9fc]/50 transition">
                            <td className="px-4 py-3">
                              <input type="date" value={t.fecha} onChange={e => actualizarTx(t.id, 'fecha', e.target.value)} className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-32 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                            </td>
                            <td className="px-4 py-3">
                              <select value={t.tipo} onChange={e => actualizarTx(t.id, 'tipo', e.target.value)} className={`border rounded-lg px-2 py-1.5 font-medium ${t.tipo === 'Ingreso' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                <option>Ingreso</option>
                                <option>Egreso</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select value={t.cat} onChange={e => actualizarTx(t.id, 'cat', e.target.value)} className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-28 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none">
                                <option value="">-</option>
                                {(t.tipo === 'Ingreso' ? CAT_ING : CAT_EGR).map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={t.concepto} onChange={e => actualizarTx(t.id, 'concepto', e.target.value)} placeholder="Descripción" className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-full min-w-[140px] focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={t.notas || ''} onChange={e => actualizarTx(t.id, 'notas', e.target.value)} placeholder="Notas" className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-full min-w-[160px] focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                            </td>
                            <td className="px-4 py-3">
                              <select value={t.caja} onChange={e => actualizarTx(t.id, 'caja', e.target.value)} className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-28 focus:ring-2 focus:ring-[#4f67eb]/20 outline-none">
                                {CAJAS.map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" value={t.monto} onChange={e => actualizarTx(t.id, 'monto', e.target.value)} placeholder="0.00" className="bg-transparent border border-gray-200 rounded-lg px-2 py-1.5 w-28 text-right font-medium focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => eliminarTx(t.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== BASE DE DATOS ===== */}
          {tab === 'database' && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <p className="text-[#b7bac3] text-sm">
                    {databaseSections.reduce((total, section) => total + section.rows.length, 0)} registros guardados
                  </p>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b7bac3]" />
                  <input
                    type="text"
                    value={dbFiltro}
                    onChange={e => setDbFiltro(e.target.value)}
                    placeholder="Buscar en la base de datos"
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {databaseSections.map(section => {
                  const rows = dbFiltro
                    ? section.rows.filter(row => JSON.stringify(row).toLowerCase().includes(dbFiltro.toLowerCase()))
                    : section.rows;

                  return (
                    <div key={section.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-[#2a1d89] font-semibold">{section.title}</h3>
                          <p className="text-sm text-[#b7bac3]">{section.description}</p>
                        </div>
                        <span className="text-sm font-medium text-[#4f67eb]">{rows.length} registros</span>
                      </div>

                      {rows.length === 0 ? (
                        <div className="py-8 text-center text-[#b7bac3]">No hay registros en esta sección</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[#2a1d89] border-b border-gray-100">
                                {section.columns.map(column => (
                                  <th key={column.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                                    {column.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, idx) => (
                                <tr key={row.id || idx} className="border-b border-gray-50 last:border-b-0">
                                  {section.columns.map(column => {
                                    const value = renderCellValue(column, row);
                                    return (
                                      <td key={column.key} className="px-3 py-2 text-[#2a1d89] max-w-[220px] truncate" title={String(value)}>
                                        {value}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== CONTACTOS ===== */}
          {tab === 'contactos' && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-gray-200 pb-4">
                {[
                  { id: 'cli', label: `Clientes (${cli.length})`, icon: Users },
                  { id: 'prov', label: `Proveedores (${prov.length})`, icon: Building },
                  { id: 'emp', label: `Empleados (${emp.length})`, icon: User },
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setSubTab(t.id)} 
                    className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition ${
                      subTab === t.id 
                        ? 'bg-[#4f67eb] text-white shadow-md shadow-[#4f67eb]/20' 
                        : 'text-[#2a1d89] hover:bg-gray-100'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />{t.label}
                  </button>
                ))}
              </div>

              {subTab === 'cli' && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-[#2a1d89]">Clientes</h3>
                    <div className="flex gap-3">
                      <ExportMenu onCsv={() => exportarClientes('csv')} onJson={() => exportarClientes('json')} />
                      <button onClick={agregarCliente} className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20">
                        <Plus className="w-4 h-4" />Nuevo Cliente
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cli.map(c => (
                      <div key={c.id} onClick={() => abrirModal('cli', c)} className="bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-[#4f67eb] hover:shadow-lg transition-all">
                        <p className="font-bold text-[#2a1d89]">{c.nombre || 'Sin nombre'}</p>
                        {c.email && <p className="text-[#b7bac3] text-sm mt-1">📧 {c.email}</p>}
                        {c.tel && <p className="text-[#b7bac3] text-sm">📞 {c.tel}</p>}
                      </div>
                    ))}
                  </div>
                  {cli.length === 0 && <p className="text-center py-16 text-[#b7bac3]">No hay clientes</p>}
                </>
              )}

              {subTab === 'prov' && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-[#2a1d89]">Proveedores</h3>
                    <button onClick={agregarProveedor} className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20">
                      <Plus className="w-4 h-4" />Nuevo Proveedor
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prov.map(p => (
                      <div key={p.id} onClick={() => abrirModal('prov', p)} className="bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-[#4f67eb] hover:shadow-lg transition-all">
                        <p className="font-bold text-[#2a1d89]">{p.nombre || 'Sin nombre'}</p>
                        {p.email && <p className="text-[#b7bac3] text-sm mt-1">📧 {p.email}</p>}
                        {p.banco && <p className="text-[#4f67eb] text-sm">🏦 {p.banco}</p>}
                      </div>
                    ))}
                  </div>
                  {prov.length === 0 && <p className="text-center py-16 text-[#b7bac3]">No hay proveedores</p>}
                </>
              )}

              {subTab === 'emp' && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-[#2a1d89]">Empleados</h3>
                    <button onClick={agregarEmpleado} className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20">
                      <Plus className="w-4 h-4" />Nuevo Empleado
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emp.map(e => (
                      <div key={e.id} onClick={() => abrirModal('emp', e)} className="bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-[#4f67eb] hover:shadow-lg transition-all">
                        <p className="font-bold text-[#2a1d89]">{e.nombre || 'Sin nombre'}</p>
                        <p className="text-[#b7bac3] text-sm">{e.puesto || 'Sin puesto'}</p>
                        <p className="text-[#4f67eb] font-bold mt-2">{fmt((Number(e.salario) || 0) * 30)}/mes</p>
                      </div>
                    ))}
                  </div>
                  {emp.length === 0 && <p className="text-center py-16 text-[#b7bac3]">No hay empleados</p>}
                </>
              )}
            </div>
          )}

          {/* ===== FINANZAS ===== */}
          {tab === 'finanzas' && (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Ingresos Totales" value={fmt(totales.ing)} color="success" />
                <StatCard title="Egresos Totales" value={fmt(totales.egr)} color="danger" />
                <StatCard title="Balance Neto" value={fmt(totales.balance)} color={totales.balance >= 0 ? 'primary' : 'danger'} />
                <StatCard title="Margen Bruto" value={`${metricas.margenBruto.toFixed(1)}%`} color="primary" />
              </div>

              {/* Balance y Estado de Resultados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#2a1d89] mb-5 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#4f67eb]" />Balance General
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#2a1d89]">Efectivo</span>
                        <span className={totales.efectivo >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>{fmt(totales.efectivo)}</span>
                      </div>
                      <ProgressBar value={Math.abs(totales.efectivo)} max={totales.ing || 1} color={totales.efectivo >= 0 ? 'success' : 'danger'} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#2a1d89]">Bancos</span>
                        <span className={totales.banco >= 0 ? 'text-[#4f67eb] font-medium' : 'text-red-500 font-medium'}>{fmt(totales.banco)}</span>
                      </div>
                      <ProgressBar value={Math.abs(totales.banco)} max={totales.ing || 1} color="primary" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#2a1d89]">Por Cobrar</span>
                        <span className="text-amber-600 font-medium">{fmt(totales.xCobrar)}</span>
                      </div>
                      <ProgressBar value={totales.xCobrar} max={totales.ing || 1} color="warning" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#2a1d89]">Por Pagar</span>
                        <span className="text-red-500 font-medium">{fmt(totales.xPagar)}</span>
                      </div>
                      <ProgressBar value={totales.xPagar} max={totales.egr || 1} color="danger" />
                    </div>
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#2a1d89]">Liquidez Disponible</span>
                        <span className={`font-bold ${metricas.liquidez >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(metricas.liquidez)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-[#2a1d89]">Capital de Trabajo</span>
                        <span className={`font-bold ${metricas.capitalTrabajo >= 0 ? 'text-[#4f67eb]' : 'text-red-500'}`}>{fmt(metricas.capitalTrabajo)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#2a1d89] mb-5 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#4f67eb]" />Estado de Resultados
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-[#2a1d89]">Ingresos</span>
                      <span className="text-emerald-600 font-semibold">{fmt(totales.ing)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-[#2a1d89]">(-) Egresos</span>
                      <span className="text-red-500 font-semibold">{fmt(totales.egr)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-[#2a1d89]">= Utilidad Bruta</span>
                      <span className={`font-semibold ${totales.balance >= 0 ? 'text-[#4f67eb]' : 'text-red-500'}`}>{fmt(totales.balance)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-[#2a1d89]">(-) ISR Estimado (30%)</span>
                      <span className="text-red-400">{fmt(Math.max(0, totales.balance * 0.3))}</span>
                    </div>
                    <div className="flex justify-between py-4 bg-[#4f67eb]/5 rounded-xl px-4 mt-2">
                      <span className="font-bold text-[#2a1d89]">Utilidad Neta</span>
                      <span className="font-bold text-xl text-[#4f67eb]">{fmt(Math.max(0, totales.balance * 0.7))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-[#2a1d89] mb-5 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#4f67eb]" />Métricas Clave
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-[#b7bac3] text-sm mb-1">ROI</p>
                    <p className="text-2xl font-bold text-[#4f67eb]">{metricas.roi.toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-[#b7bac3] text-sm mb-1">Transacciones</p>
                    <p className="text-2xl font-bold text-[#2a1d89]">{txFiltradas.length}</p>
                  </div>
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-[#b7bac3] text-sm mb-1">Prom. Ingreso</p>
                    <p className="text-xl font-bold text-emerald-600">{fmt(metricas.promedioIngreso)}</p>
                  </div>
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-[#b7bac3] text-sm mb-1">Prom. Egreso</p>
                    <p className="text-xl font-bold text-red-500">{fmt(metricas.promedioEgreso)}</p>
                  </div>
                </div>
              </div>

              {/* Categorías */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#2a1d89] mb-5 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-500" />Ingresos por Categoría
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analisisCategorias.ingresos)
                      .filter(([_, v]) => v > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, val]) => (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-[#2a1d89]">{cat}</span>
                            <span className="text-emerald-600 font-medium">{fmt(val)}</span>
                          </div>
                          <ProgressBar value={val} max={totales.ing || 1} color="success" />
                        </div>
                      ))}
                    {Object.values(analisisCategorias.ingresos).every(v => v === 0) && (
                      <p className="text-[#b7bac3] text-sm text-center py-4">Sin datos</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#2a1d89] mb-5 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-red-500" />Egresos por Categoría
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analisisCategorias.egresos)
                      .filter(([_, v]) => v > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, val]) => (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-[#2a1d89]">{cat}</span>
                            <span className="text-red-500 font-medium">{fmt(val)}</span>
                          </div>
                          <ProgressBar value={val} max={totales.egr || 1} color="danger" />
                        </div>
                      ))}
                    {Object.values(analisisCategorias.egresos).every(v => v === 0) && (
                      <p className="text-[#b7bac3] text-sm text-center py-4">Sin datos</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== BITACORA ===== */}
          {tab === 'bitacora' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#2a1d89]">Bitácora de Actividad</h2>
                  <p className="text-[#b7bac3] mt-1">Historial de todas las acciones realizadas en el sistema</p>
                </div>
              </div>
              <ActivityLog
                activities={activities}
                loading={activityLoading}
                showFilter={true}
                showSearch={true}
                maxItems={100}
                emptyMessage="No hay actividades registradas aún. Las acciones que realices se mostrarán aquí."
              />
            </div>
          )}

          {/* ===== CONFIG ===== */}
          {tab === 'config' && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-[#2a1d89] flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#4f67eb]" />Empresa
                </h3>
                <div>
                  <label className="text-[#b7bac3] text-sm block mb-1.5">Nombre</label>
                  <input type="text" value={cfg.empresa} onChange={e => setCfg({...cfg, empresa: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                </div>
                <div>
                  <label className="text-[#b7bac3] text-sm block mb-1.5">RFC</label>
                  <input type="text" value={cfg.rfc} onChange={e => setCfg({...cfg, rfc: e.target.value.toUpperCase()})} maxLength={13} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                </div>
                <div>
                  <label className="text-[#b7bac3] text-sm block mb-1.5">Dirección</label>
                  <input type="text" value={cfg.dir} onChange={e => setCfg({...cfg, dir: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Teléfono</label>
                    <input type="text" value={cfg.tel} onChange={e => setCfg({...cfg, tel: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Email</label>
                    <input type="email" value={cfg.email} onChange={e => setCfg({...cfg, email: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-[#2a1d89] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#4f67eb]" />Estadísticas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-2xl font-bold text-[#4f67eb]">{tx.length}</p>
                    <p className="text-sm text-[#b7bac3]">Transacciones</p>
                  </div>
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-2xl font-bold text-[#4f67eb]">{leads.length}</p>
                    <p className="text-sm text-[#b7bac3]">Leads</p>
                  </div>
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-2xl font-bold text-[#4f67eb]">{cli.length}</p>
                    <p className="text-sm text-[#b7bac3]">Clientes</p>
                  </div>
                  <div className="text-center p-4 bg-[#f8f9fc] rounded-xl">
                    <p className="text-2xl font-bold text-[#4f67eb]">{fact.length}</p>
                    <p className="text-sm text-[#b7bac3]">Facturas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-[#2a1d89] flex items-center gap-2">
                  <Download className="w-5 h-5 text-[#4f67eb]" />Exportación y respaldo
                </h3>
                <p className="text-sm text-[#b7bac3]">
                  Exporta un respaldo completo en JSON para procesar todo el historial en otras herramientas.
                </p>
                <div>
                  <button
                    onClick={exportarRespaldo}
                    className="px-4 py-2.5 bg-[#4f67eb] text-white rounded-xl text-sm font-medium hover:bg-[#2a1d89] transition flex items-center gap-2 shadow-md shadow-[#4f67eb]/20"
                  >
                    <Download className="w-4 h-4" />Descargar respaldo JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===== MODALES ===== */}
      {modalOpen && editData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-lg text-[#2a1d89]">
                {modalType === 'lead' && '🎯 Lead'}
                {modalType === 'cli' && '👤 Cliente'}
                {modalType === 'prov' && '🏢 Proveedor'}
                {modalType === 'emp' && '👷 Empleado'}
                {modalType === 'fact' && '📄 Factura'}
                {modalType === 'junta' && '📅 Junta'}
              </h3>
              <button onClick={cerrarModal} className="text-[#b7bac3] hover:text-[#2a1d89] p-2 hover:bg-gray-100 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Modal Lead */}
              {modalType === 'lead' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Contacto</label>
                      <input type="text" value={editData.contacto || ''} onChange={e => cambiarCampo('contacto', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Teléfono</label>
                      <input type="text" value={editData.tel || ''} onChange={e => cambiarCampo('tel', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Email</label>
                    <input type="email" value={editData.email || ''} onChange={e => cambiarCampo('email', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Venue *</label>
                      <input type="text" value={editData.venue || ''} onChange={e => cambiarCampo('venue', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Tipo</label>
                      <select value={editData.tipo} onChange={e => cambiarCampo('tipo', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        {TIPOS_VENUE.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Ciudad</label>
                      <input type="text" value={editData.ciudad || ''} onChange={e => cambiarCampo('ciudad', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Fuente</label>
                      <select value={editData.fuente} onChange={e => cambiarCampo('fuente', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        {FUENTES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Estado</label>
                      <select value={editData.estado} onChange={e => cambiarCampo('estado', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        {EST_LEAD.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Plan</label>
                      <select value={editData.plan} onChange={e => cambiarCampo('plan', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        {PLANES.map(p => <option key={p.id} value={p.id}>{p.nombre} ({fmt(p.precio)}/mes)</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Notas</label>
                    <textarea value={editData.notas || ''} onChange={e => cambiarCampo('notas', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none resize-none" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    {editData.estado !== 'cerrado' && (
                      <button onClick={convertirLead} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />Convertir
                      </button>
                    )}
                    <button onClick={() => agregarJunta(editData.id)} className="bg-[#4f67eb]/10 text-[#4f67eb] px-4 py-2.5 rounded-xl font-medium hover:bg-[#4f67eb]/20 transition flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />Junta
                    </button>
                    <button onClick={guardarYCerrar} className="flex-1 bg-[#4f67eb] hover:bg-[#2a1d89] text-white px-4 py-2.5 rounded-xl font-medium transition">Guardar</button>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={ejecutarEliminacion} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-600 transition">
                        ¿Confirmar?
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Modal Junta */}
              {modalType === 'junta' && (
                <>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Lead</label>
                    <select value={editData.leadId || ''} onChange={e => {
                      const l = leads.find(x => x.id === Number(e.target.value));
                      cambiarCampo('leadId', e.target.value);
                      cambiarCampo('leadNombre', l ? (l.venue || l.contacto) : '');
                    }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                      <option value="">Sin asignar</option>
                      {leads.filter(l => !['cerrado', 'perdido'].includes(l.estado)).map(l => (
                        <option key={l.id} value={l.id}>{l.venue || l.contacto}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Fecha</label>
                      <input type="date" value={editData.fecha} onChange={e => cambiarCampo('fecha', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Hora</label>
                      <input type="time" value={editData.hora} onChange={e => cambiarCampo('hora', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Duración</label>
                      <select value={editData.duracion} onChange={e => cambiarCampo('duracion', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        <option value="30">30 min</option>
                        <option value="60">1 hora</option>
                        <option value="90">1.5 horas</option>
                        <option value="120">2 horas</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Tipo</label>
                      <select value={editData.tipo} onChange={e => cambiarCampo('tipo', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        <option value="presencial">Presencial</option>
                        <option value="videollamada">Videollamada</option>
                        <option value="llamada">Llamada</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Estado</label>
                      <select value={editData.estado} onChange={e => cambiarCampo('estado', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        <option value="pendiente">Pendiente</option>
                        <option value="realizada">Realizada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Lugar / Link</label>
                    <input type="text" value={editData.lugar || ''} onChange={e => cambiarCampo('lugar', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Notas</label>
                    <textarea value={editData.notas || ''} onChange={e => cambiarCampo('notas', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none resize-none" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={guardarYCerrar} className="flex-1 bg-[#4f67eb] hover:bg-[#2a1d89] text-white px-4 py-2.5 rounded-xl font-medium transition">Guardar</button>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={ejecutarEliminacion} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-600 transition">
                        ¿Confirmar?
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Modal Cliente */}
              {modalType === 'cli' && (
                <>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Nombre *</label>
                    <input type="text" value={editData.nombre || ''} onChange={e => cambiarCampo('nombre', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">RFC</label>
                    <input type="text" value={editData.rfc || ''} onChange={e => cambiarCampo('rfc', e.target.value.toUpperCase())} maxLength={13} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Email</label>
                      <input type="email" value={editData.email || ''} onChange={e => cambiarCampo('email', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Teléfono</label>
                      <input type="text" value={editData.tel || ''} onChange={e => cambiarCampo('tel', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Notas</label>
                    <textarea value={editData.notas || ''} onChange={e => cambiarCampo('notas', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none resize-none" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={guardarYCerrar} className="flex-1 bg-[#4f67eb] hover:bg-[#2a1d89] text-white px-4 py-2.5 rounded-xl font-medium transition">Guardar</button>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={ejecutarEliminacion} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-600 transition">
                        ¿Confirmar?
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Modal Proveedor */}
              {modalType === 'prov' && (
                <>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Nombre *</label>
                    <input type="text" value={editData.nombre || ''} onChange={e => cambiarCampo('nombre', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">RFC</label>
                    <input type="text" value={editData.rfc || ''} onChange={e => cambiarCampo('rfc', e.target.value.toUpperCase())} maxLength={13} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Email</label>
                      <input type="email" value={editData.email || ''} onChange={e => cambiarCampo('email', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Teléfono</label>
                      <input type="text" value={editData.tel || ''} onChange={e => cambiarCampo('tel', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Banco</label>
                      <input type="text" value={editData.banco || ''} onChange={e => cambiarCampo('banco', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Cuenta</label>
                      <input type="text" value={editData.cuenta || ''} onChange={e => cambiarCampo('cuenta', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={guardarYCerrar} className="flex-1 bg-[#4f67eb] hover:bg-[#2a1d89] text-white px-4 py-2.5 rounded-xl font-medium transition">Guardar</button>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={ejecutarEliminacion} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-600 transition">
                        ¿Confirmar?
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Modal Empleado */}
              {modalType === 'emp' && (
                <>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Nombre *</label>
                    <input type="text" value={editData.nombre || ''} onChange={e => cambiarCampo('nombre', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">RFC</label>
                    <input type="text" value={editData.rfc || ''} onChange={e => cambiarCampo('rfc', e.target.value.toUpperCase())} maxLength={13} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Puesto</label>
                    <input type="text" value={editData.puesto || ''} onChange={e => cambiarCampo('puesto', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Salario Diario</label>
                      <input type="number" value={editData.salario || ''} onChange={e => cambiarCampo('salario', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Mensual</label>
                      <div className="bg-[#4f67eb]/10 rounded-xl px-4 py-2.5">
                        <p className="text-[#4f67eb] font-bold">{fmt((Number(editData.salario) || 0) * 30)}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Fecha Ingreso</label>
                    <input type="date" value={editData.fecha || ''} onChange={e => cambiarCampo('fecha', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={guardarYCerrar} className="flex-1 bg-[#4f67eb] hover:bg-[#2a1d89] text-white px-4 py-2.5 rounded-xl font-medium transition">Guardar</button>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={ejecutarEliminacion} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-600 transition">
                        ¿Confirmar?
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Modal Factura */}
              {modalType === 'fact' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Fecha</label>
                      <input type="date" value={editData.fecha} onChange={e => cambiarCampo('fecha', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Vencimiento</label>
                      <input type="date" value={editData.vence || ''} onChange={e => cambiarCampo('vence', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none" />
                    </div>
                    <div>
                      <label className="text-[#b7bac3] text-sm block mb-1.5">Estado</label>
                      <select value={editData.estado} onChange={e => cambiarCampo('estado', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                        {EST_FACT.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Cliente</label>
                    <select value={editData.clienteId || ''} onChange={e => {
                      const c = cli.find(x => x.id === Number(e.target.value));
                      cambiarCampo('clienteId', e.target.value);
                      cambiarCampo('clienteNom', c?.nombre || '');
                    }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none">
                      <option value="">Seleccionar...</option>
                      {cli.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[#b7bac3] text-sm">Conceptos</label>
                      <button onClick={agregarItemFactura} className="text-[#4f67eb] text-sm font-medium flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" />Agregar</button>
                    </div>
                    {editData.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center mb-2">
                        <input type="text" value={item.d} onChange={e => actualizarItemFactura(idx, 'd', e.target.value)} placeholder="Descripción" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                        <input type="number" value={item.c} onChange={e => actualizarItemFactura(idx, 'c', e.target.value)} className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" min="1" />
                        <input type="number" value={item.p} onChange={e => actualizarItemFactura(idx, 'p', e.target.value)} className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:ring-2 focus:ring-[#4f67eb]/20 outline-none" />
                        <span className="w-24 text-right text-[#4f67eb] text-sm font-medium">{fmt(item.c * item.p)}</span>
                        {editData.items.length > 1 && (
                          <button onClick={() => eliminarItemFactura(idx)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#f8f9fc] rounded-xl p-4 text-sm">
                    <div className="flex justify-between mb-2"><span className="text-[#b7bac3]">Subtotal</span><span className="text-[#2a1d89]">{fmt(editData.sub)}</span></div>
                    <div className="flex justify-between mb-2"><span className="text-[#b7bac3]">IVA (16%)</span><span className="text-[#2a1d89]">{fmt(editData.iva)}</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200"><span className="text-[#2a1d89]">Total</span><span className="text-[#4f67eb]">{fmt(editData.total)}</span></div>
                  </div>

                  <div>
                    <label className="text-[#b7bac3] text-sm block mb-1.5">Notas</label>
                    <textarea value={editData.notas || ''} onChange={e => cambiarCampo('notas', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4f67eb]/20 focus:border-[#4f67eb] outline-none resize-none" />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={imprimirFactura} className="flex-1 bg-[#4f67eb]/10 text-[#4f67eb] px-4 py-2.5 rounded-xl font-medium hover:bg-[#4f67eb]/20 transition flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Imprimir</button>
                    <button onClick={guardarYCerrar} className="flex-1 bg-[#4f67eb] hover:bg-[#2a1d89] text-white px-4 py-2.5 rounded-xl font-medium transition">Guardar</button>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl hover:bg-red-100 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={ejecutarEliminacion} className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-600 transition">
                        ¿Confirmar?
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async (email, password) => {
          const result = await login(email, password);
          if (result.success) {
            notify('Sesión iniciada correctamente');
          }
          return result;
        }}
        onRegister={async (email, password, displayName) => {
          const result = await register(email, password, displayName);
          if (result.success) {
            notify('Cuenta creada exitosamente');
          }
          return result;
        }}
        onResetPassword={sendPasswordReset}
      />
    </div>
  );
}
