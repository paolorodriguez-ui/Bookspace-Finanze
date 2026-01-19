import { STORAGE_KEYS } from '../constants';

/**
 * Error personalizado para operaciones de storage
 */
export class StorageError extends Error {
  constructor(message, key, operation) {
    super(message);
    this.name = 'StorageError';
    this.key = key;
    this.operation = operation;
  }
}

/**
 * Carga un valor del storage
 * @param {string} key - Key del storage
 * @param {any} defaultValue - Valor por defecto
 * @returns {Promise<any>} - Valor cargado o default
 */
export const loadFromStorage = async (key, defaultValue = null) => {
  try {
    const result = await window.storage.get(key);
    if (result && result.value) {
      return JSON.parse(result.value);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    throw new StorageError(`Failed to load ${key}`, key, 'load');
  }
};

/**
 * Guarda un valor en el storage
 * @param {string} key - Key del storage
 * @param {any} value - Valor a guardar
 * @returns {Promise<void>}
 */
export const saveToStorage = async (key, value) => {
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    throw new StorageError(`Failed to save ${key}`, key, 'save');
  }
};

/**
 * Carga todos los datos del storage
 * @returns {Promise<object>} - Objeto con todos los datos
 */
export const loadAllData = async () => {
  const data = {
    transactions: [],
    clients: [],
    providers: [],
    employees: [],
    leads: [],
    invoices: [],
    meetings: [],
    config: { empresa: 'Bookspace', rfc: '', dir: '', tel: '', email: '' }
  };

  const loadPromises = [
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, []).then(v => data.transactions = v),
    loadFromStorage(STORAGE_KEYS.CLIENTS, []).then(v => data.clients = v),
    loadFromStorage(STORAGE_KEYS.PROVIDERS, []).then(v => data.providers = v),
    loadFromStorage(STORAGE_KEYS.EMPLOYEES, []).then(v => data.employees = v),
    loadFromStorage(STORAGE_KEYS.LEADS, []).then(v => data.leads = v),
    loadFromStorage(STORAGE_KEYS.INVOICES, []).then(v => data.invoices = v),
    loadFromStorage(STORAGE_KEYS.MEETINGS, []).then(v => data.meetings = v),
    loadFromStorage(STORAGE_KEYS.CONFIG, data.config).then(v => data.config = v),
  ];

  await Promise.all(loadPromises);
  return data;
};

/**
 * Guarda todos los datos en el storage
 * @param {object} data - Objeto con todos los datos
 * @returns {Promise<void>}
 */
export const saveAllData = async (data) => {
  const savePromises = [
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions),
    saveToStorage(STORAGE_KEYS.CLIENTS, data.clients),
    saveToStorage(STORAGE_KEYS.PROVIDERS, data.providers),
    saveToStorage(STORAGE_KEYS.EMPLOYEES, data.employees),
    saveToStorage(STORAGE_KEYS.LEADS, data.leads),
    saveToStorage(STORAGE_KEYS.INVOICES, data.invoices),
    saveToStorage(STORAGE_KEYS.MEETINGS, data.meetings),
    saveToStorage(STORAGE_KEYS.CONFIG, data.config),
  ];

  await Promise.all(savePromises);
};

export const saveTransactions = async (transactions) =>
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);

export const saveClients = async (clients) =>
  saveToStorage(STORAGE_KEYS.CLIENTS, clients);

export const saveProviders = async (providers) =>
  saveToStorage(STORAGE_KEYS.PROVIDERS, providers);

export const saveEmployees = async (employees) =>
  saveToStorage(STORAGE_KEYS.EMPLOYEES, employees);

export const saveLeads = async (leads) =>
  saveToStorage(STORAGE_KEYS.LEADS, leads);

export const saveInvoices = async (invoices) =>
  saveToStorage(STORAGE_KEYS.INVOICES, invoices);

export const saveMeetings = async (meetings) =>
  saveToStorage(STORAGE_KEYS.MEETINGS, meetings);

export const saveConfig = async (config) =>
  saveToStorage(STORAGE_KEYS.CONFIG, config);
