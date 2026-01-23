import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveUserDataToCloud,
  loadUserDataFromCloud,
  subscribeToUserData,
  syncDataWithCloud,
  isFirebaseConfigured,
  loadTasksFromCloud,
  subscribeToTasks
} from '../firebase';

/**
 * Estados de sincronización
 */
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
  OFFLINE: 'offline'
};

/**
 * Hook para sincronizar datos con la nube
 */
export const useCloudSync = (userId, localData, onDataUpdate) => {
  const [syncStatus, setSyncStatus] = useState(SYNC_STATUS.IDLE);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [error, setError] = useState(null);
  const localVersionRef = useRef(Date.now());
  const debounceTimerRef = useRef(null);
  const isSubscribedRef = useRef(false);

  // Verificar si Firebase está configurado
  const isEnabled = isFirebaseConfigured() && !!userId;
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const isNetworkError = useCallback((err) => {
    if (!err) return false;
    const code = err.code || err.name;
    const message = String(err.message || '').toLowerCase();
    return (
      code === 'unavailable' ||
      code === 'network-request-failed' ||
      message.includes('offline') ||
      message.includes('network') ||
      message.includes('failed to get document because the client is offline')
    );
  }, []);

  const markOffline = useCallback(() => {
    setSyncStatus(SYNC_STATUS.OFFLINE);
    setError('Sin conexión');
  }, []);

  const mergeEntityArrays = useCallback((local = [], cloud = []) => {
    const merged = new Map();

    const normalizeTime = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (val instanceof Date) return val.getTime();
      if (typeof val === 'string') return new Date(val).getTime();
      if (typeof val === 'object') {
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val.seconds) return val.seconds * 1000;
      }
      return 0;
    };

    local.forEach((item) => {
      if (item?.id) {
        merged.set(item.id, item);
      }
    });

    cloud.forEach((item) => {
      if (item?.id) {
        const existing = merged.get(item.id);
        if (!existing) {
          merged.set(item.id, item);
          return;
        }

        const localTime = normalizeTime(existing.updatedAt || existing.fecha);
        const cloudTime = normalizeTime(item.updatedAt || item.fecha);

        // Respetar el timestamp más reciente
        if (cloudTime > localTime) {
          merged.set(item.id, item);
        }
      }
    });

    return Array.from(merged.values());
  }, []);

  const mergeCloudWithLocal = useCallback((cloudData) => {
    if (!localData) {
      return cloudData;
    }

    return {
      transactions: mergeEntityArrays(localData.transactions, cloudData.transactions),
      clients: mergeEntityArrays(localData.clients, cloudData.clients),
      providers: mergeEntityArrays(localData.providers, cloudData.providers),
      employees: mergeEntityArrays(localData.employees, cloudData.employees),
      leads: mergeEntityArrays(localData.leads, cloudData.leads),
      invoices: mergeEntityArrays(localData.invoices, cloudData.invoices),
      meetings: mergeEntityArrays(localData.meetings, cloudData.meetings),
      config: { ...localData.config, ...cloudData.config }
    };
  }, [localData, mergeEntityArrays]);

  // Cargar datos iniciales de la nube
  const loadFromCloud = useCallback(async () => {
    if (!isEnabled) return null;
    if (isOffline) {
      markOffline();
      return null;
    }

    setSyncStatus(SYNC_STATUS.SYNCING);
    setError(null);

    try {
      const [result, tasksResult] = await Promise.all([
        loadUserDataFromCloud(userId),
        loadTasksFromCloud(userId)
      ]);

      const data = result.success ? (result.data || {}) : {};
      const tasksData = tasksResult.success ? tasksResult.data : [];

      if (tasksData.length > 0) {
        data.tasks = tasksData;
      }

      if ((result.success && result.data) || tasksData.length > 0) {
        setSyncStatus(SYNC_STATUS.SYNCED);
        setLastSyncTime(new Date());
        return data;
      }

      setSyncStatus(SYNC_STATUS.SYNCED);
      return null;
    } catch (err) {
      if (isNetworkError(err)) {
        markOffline();
        return null;
      }
      setSyncStatus(SYNC_STATUS.ERROR);
      setError(err.message);
      return null;
    }
  }, [userId, isEnabled, isOffline, isNetworkError, markOffline]);

  // Guardar datos en la nube
  const saveToCloud = useCallback(async (data) => {
    if (!isEnabled) return false;
    if (isOffline) {
      markOffline();
      return false;
    }

    setSyncStatus(SYNC_STATUS.SYNCING);
    setError(null);

    try {
      const result = await saveUserDataToCloud(userId, data);

      if (result.success) {
        localVersionRef.current = Date.now();
        setSyncStatus(SYNC_STATUS.SYNCED);
        setLastSyncTime(new Date());
        return true;
      }

      throw new Error(result.error || 'Error al guardar');
    } catch (err) {
      if (isNetworkError(err)) {
        markOffline();
        return false;
      }
      setSyncStatus(SYNC_STATUS.ERROR);
      setError(err.message);
      return false;
    }
  }, [userId, isEnabled, isOffline, isNetworkError, markOffline]);

  // Guardar con debounce
  const saveToCloudDebounced = useCallback((data) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveToCloud(data);
    }, 2000); // 2 segundos de debounce
  }, [saveToCloud]);

  // Sincronizar datos (merge inteligente)
  const syncWithCloud = useCallback(async () => {
    if (!isEnabled || !localData) return;
    if (isOffline) {
      markOffline();
      return;
    }

    setSyncStatus(SYNC_STATUS.SYNCING);
    setError(null);

    try {
      const result = await syncDataWithCloud(
        userId,
        localData,
        localVersionRef.current
      );

      if (result.success) {
        if (result.action === 'downloaded' || result.action === 'merged') {
          onDataUpdate?.(result.data);
        }
        localVersionRef.current = Date.now();
        setSyncStatus(SYNC_STATUS.SYNCED);
        setLastSyncTime(new Date());
      } else {
        throw new Error(result.error || 'Error de sincronización');
      }
    } catch (err) {
      if (isNetworkError(err)) {
        markOffline();
        return;
      }
      setSyncStatus(SYNC_STATUS.ERROR);
      setError(err.message);
    }
  }, [userId, localData, onDataUpdate, isEnabled, isOffline, isNetworkError, markOffline]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!isEnabled || isSubscribedRef.current) return;

    isSubscribedRef.current = true;

    const unsubscribe = subscribeToUserData(userId, (cloudData) => {
      // SIEMPRE hacer merge con datos de la nube para sincronizar colecciones compartidas
      // La lógica de mergeEntityArrays usa updatedAt de cada elemento para resolver conflictos
      const mergedData = mergeCloudWithLocal(cloudData);
      onDataUpdate?.(mergedData);
      if (cloudData.version) {
        localVersionRef.current = Math.max(localVersionRef.current, cloudData.version);
      }
      setSyncStatus(SYNC_STATUS.SYNCED);
      setLastSyncTime(new Date());
    });

    return () => {
      unsubscribe();
      isSubscribedRef.current = false;
    };
  }, [userId, onDataUpdate, isEnabled, mergeCloudWithLocal]);

  useEffect(() => {
    if (!isEnabled || !userId) return;

    const unsubscribe = subscribeToTasks(userId, (tasks) => {
      if (Array.isArray(tasks)) {
        onDataUpdate?.({ tasks });
        setSyncStatus(SYNC_STATUS.SYNCED);
        setLastSyncTime(new Date());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, onDataUpdate, isEnabled]);

  // Detectar estado offline
  useEffect(() => {
    const handleOnline = () => {
      if (syncStatus === SYNC_STATUS.OFFLINE) {
        syncWithCloud();
      }
    };

    const handleOffline = () => {
      setSyncStatus(SYNC_STATUS.OFFLINE);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar estado inicial
    if (!navigator.onLine) {
      setSyncStatus(SYNC_STATUS.OFFLINE);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus, syncWithCloud]);

  // Cleanup de debounce
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isEnabled,
    syncStatus,
    lastSyncTime,
    error,
    loadFromCloud,
    saveToCloud,
    saveToCloudDebounced,
    syncWithCloud
  };
};
