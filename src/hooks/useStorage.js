import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadAllData,
  saveClients,
  saveConfig,
  saveEmployees,
  saveInvoices,
  saveLeads,
  saveMeetings,
  saveProviders,
  saveTransactions,
} from '../utils/storage';
import { handleError } from '../utils/errorHandling';

/**
 * Hook para manejar el almacenamiento de datos
 * @param {function} notifyFn - Función de notificación
 * @returns {object} - Estado y métodos de storage
 */
export const useStorage = (notifyFn) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    transactions: [],
    clients: [],
    providers: [],
    employees: [],
    leads: [],
    invoices: [],
    meetings: [],
    config: { empresa: 'Bookspace', rfc: '', dir: '', tel: '', email: '' }
  });
  const prevDataRef = useRef({});
  const debounceTimersRef = useRef({});
  const debounceMs = 1000;

  // Cargar datos al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedData = await loadAllData();
        setData(loadedData);
      } catch (error) {
        handleError(error, 'useStorage.loadData', notifyFn);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [notifyFn]);

  useEffect(() => {
    if (!loading) {
      prevDataRef.current = {
        transactions: data.transactions,
        clients: data.clients,
        providers: data.providers,
        employees: data.employees,
        leads: data.leads,
        invoices: data.invoices,
        meetings: data.meetings,
        config: data.config,
      };
    }
  }, [loading]);

  // Guardar datos con debounce por entidad
  useEffect(() => {
    if (loading) return;

    const saveByEntity = {
      transactions: saveTransactions,
      clients: saveClients,
      providers: saveProviders,
      employees: saveEmployees,
      leads: saveLeads,
      invoices: saveInvoices,
      meetings: saveMeetings,
      config: saveConfig,
    };

    const prevData = prevDataRef.current;
    const entityKeys = Object.keys(saveByEntity);
    entityKeys.forEach((key) => {
      if (prevData[key] === data[key]) return;

      if (debounceTimersRef.current[key]) {
        clearTimeout(debounceTimersRef.current[key]);
      }

      debounceTimersRef.current[key] = setTimeout(async () => {
        try {
          await saveByEntity[key](data[key]);
        } catch (error) {
          handleError(error, `useStorage.saveData.${key}`, notifyFn);
        }
      }, debounceMs);

      prevDataRef.current[key] = data[key];
    });

  }, [data, loading, notifyFn]);

  useEffect(() => (
    () => {
      Object.values(debounceTimersRef.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    }
  ), []);

  // Métodos para actualizar cada tipo de dato
  const updateTransactions = useCallback((transactions) => {
    setData(prev => ({ ...prev, transactions }));
  }, []);

  const updateClients = useCallback((clients) => {
    setData(prev => ({ ...prev, clients }));
  }, []);

  const updateProviders = useCallback((providers) => {
    setData(prev => ({ ...prev, providers }));
  }, []);

  const updateEmployees = useCallback((employees) => {
    setData(prev => ({ ...prev, employees }));
  }, []);

  const updateLeads = useCallback((leads) => {
    setData(prev => ({ ...prev, leads }));
  }, []);

  const updateInvoices = useCallback((invoices) => {
    setData(prev => ({ ...prev, invoices }));
  }, []);

  const updateMeetings = useCallback((meetings) => {
    setData(prev => ({ ...prev, meetings }));
  }, []);

  const updateConfig = useCallback((config) => {
    setData(prev => ({ ...prev, config }));
  }, []);

  return {
    loading,
    data,
    updateTransactions,
    updateClients,
    updateProviders,
    updateEmployees,
    updateLeads,
    updateInvoices,
    updateMeetings,
    updateConfig,
  };
};
