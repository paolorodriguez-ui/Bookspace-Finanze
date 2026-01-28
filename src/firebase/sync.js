import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

/**
 * Nombres de las colecciones en Firestore
 */
const COLLECTIONS = {
  USERS_DATA: 'users_data',
  LEGACY_USERS: 'users',
  PROFILES: 'profiles',
  USER_CONFIGS: 'user_configs',
  TASKS: 'tasks',
  WORKSPACES: 'workspaces'
};

const SHARED_DATA_COLLECTIONS = [
  'transactions',
  'clients',
  'providers',
  'employees',
  'leads',
  'invoices',
  'meetings'
];

/**
 * Configuración de retry con backoff exponencial
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000  // 10 segundos
};

/**
 * Helper para ejecutar operaciones con retry y backoff exponencial
 * @param {Function} operation - Función async a ejecutar
 * @param {string} operationName - Nombre de la operación para logging
 * @returns {Promise} - Resultado de la operación
 */
const withRetry = async (operation, operationName = 'operation') => {
  let lastError;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isNetworkError =
        error.code === 'unavailable' ||
        error.code === 'network-request-failed' ||
        error.message?.toLowerCase().includes('offline') ||
        error.message?.toLowerCase().includes('network');

      if (!isNetworkError || attempt === RETRY_CONFIG.maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelay
      );

      console.log(`[${operationName}] Reintentando en ${delay}ms (intento ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Asegura que un item tenga updatedAt timestamp
 * @param {Object} item - Item a normalizar
 * @returns {Object} - Item con updatedAt garantizado
 */
const ensureUpdatedAt = (item) => {
  if (!item) return item;

  if (!item.updatedAt) {
    // Si tiene fecha, usar esa como fallback
    if (item.fecha) {
      const parsed = Date.parse(item.fecha);
      return { ...item, updatedAt: Number.isNaN(parsed) ? Date.now() : parsed };
    }
    return { ...item, updatedAt: Date.now() };
  }

  return item;
};

/**
 * Normaliza updatedAt a número (milisegundos)
 */
const normalizeUpdatedAt = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? 0 : asNumber;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return 0;
};

/**
 * Filtra elementos eliminados (soft delete)
 * @param {Array} items - Array de items
 * @returns {Array} - Items sin los marcados como deleted
 */
const filterDeleted = (items = []) => {
  return items.filter(item => !item.deleted);
};

const createEmptyUserData = () => ({
  transactions: [],
  clients: [],
  providers: [],
  employees: [],
  leads: [],
  invoices: [],
  meetings: [],
  config: {}
});

const getUserConfigDocRef = (userId) => doc(db, COLLECTIONS.USER_CONFIGS, userId);

const getLegacyUserDocRef = (userId) => doc(db, COLLECTIONS.USERS_DATA, userId);

const getLegacyUserRootRef = (userId) => doc(db, COLLECTIONS.LEGACY_USERS, userId);

const getLegacyUserCollectionRef = (userId, collectionName) => (
  collection(db, COLLECTIONS.LEGACY_USERS, userId, collectionName)
);

const getSharedCollectionRef = (collectionName) => collection(db, collectionName);

const getSharedDocId = (userId, docId) => `${userId}_${docId}`;

const getValidDocId = (item) => {
  if (!item) return null;
  const id = item.id ?? item.uid ?? item.key;
  if (id === null || id === undefined) return null;
  return String(id);
};

const commitBatchWrites = async (writes) => {
  for (const write of writes) {
    await write.commit();
  }
};

const writeCollectionItems = async (userId, collectionName, items = []) => {
  const chunkSize = 400;
  const batches = [];
  const collectionRef = getSharedCollectionRef(collectionName);
  const itemIds = new Set();
  const now = Date.now();

  let batch = writeBatch(db);
  let operationCount = 0;

  items.forEach((item) => {
    const docId = getValidDocId(item);
    if (!docId) {
      console.warn(`Item sin id en ${collectionName}, omitido`, item);
      return;
    }

    itemIds.add(docId);
    const docRef = doc(collectionRef, getSharedDocId(userId, docId));

    // Asegurar que cada item tenga updatedAt
    const normalizedItem = ensureUpdatedAt(item);

    batch.set(docRef, {
      ...normalizedItem,
      id: docId,
      ownerId: userId,
      // Si no tiene updatedAt después de normalizar, usar now
      updatedAt: normalizedItem.updatedAt || now
    }, { merge: true });
    operationCount += 1;

    if (operationCount === chunkSize) {
      batches.push(batch);
      batch = writeBatch(db);
      operationCount = 0;
    }
  });

  if (operationCount > 0) {
    batches.push(batch);
  }

  // ELIMINADO: Lógica de borrado de documentos no presentes (causaba perdida de datos en concurrencia)
  // Ahora usamos "Soft Deletes" (deleted: true)

  if (batches.length > 0) {
    // Ejecutar batches en paralelo para mejor rendimiento
    await Promise.all(batches.map(b => b.commit()));
  }
};

const readCollectionItems = async (userId, collectionName) => {
  return withRetry(async () => {
    const collectionRef = getSharedCollectionRef(collectionName);
    // MODIFICACIÓN: Quitamos el filtro 'where("ownerId", "==", userId)'
    // Ahora traemos TODO para que sea visible por todo el equipo.
    const snapshot = await getDocs(query(collectionRef));
    const items = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return { ...data, id: data.id ?? docSnap.id };
    });
    // Filtrar elementos marcados como eliminados (soft delete)
    return filterDeleted(items);
  }, `readCollection:${collectionName}`);
};

const migrateLegacyUserData = async (userId) => {
  const configRef = getUserConfigDocRef(userId);
  const configSnap = await getDoc(configRef);

  if (configSnap.exists() && configSnap.data()?.migratedToShared) {
    return;
  }

  const legacyDocRef = getLegacyUserDocRef(userId);
  const legacySnap = await getDoc(legacyDocRef);
  const legacyDocData = legacySnap.exists() ? legacySnap.data() : null;

  const legacyUserSnap = await getDoc(getLegacyUserRootRef(userId));
  const legacyUserData = legacyUserSnap.exists() ? legacyUserSnap.data() : null;

  const dataToMigrate = createEmptyUserData();
  dataToMigrate.config = legacyUserData?.config || legacyDocData?.config || {};

  const legacyCollections = await Promise.all(
    SHARED_DATA_COLLECTIONS.map(async (collectionName) => {
      const legacyCollectionRef = getLegacyUserCollectionRef(userId, collectionName);
      const snapshot = await getDocs(query(legacyCollectionRef));
      return snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.data()?.id ?? docSnap.id
      }));
    })
  );

  SHARED_DATA_COLLECTIONS.forEach((collectionName, index) => {
    dataToMigrate[collectionName] = legacyCollections[index] || [];
  });

  if (legacyDocData) {
    SHARED_DATA_COLLECTIONS.forEach((collectionName) => {
      if (dataToMigrate[collectionName]?.length === 0 && Array.isArray(legacyDocData[collectionName])) {
        dataToMigrate[collectionName] = legacyDocData[collectionName];
      }
    });
  }

  const hasLegacyData = SHARED_DATA_COLLECTIONS.some(
    (collectionName) => (dataToMigrate[collectionName] || []).length > 0
  ) || Object.keys(dataToMigrate.config || {}).length > 0;

  if (!hasLegacyData) {
    return;
  }

  await saveUserDataToCloud(userId, dataToMigrate);

  const legacyTasksRef = getLegacyUserCollectionRef(userId, COLLECTIONS.TASKS);
  const legacyTasksSnap = await getDocs(query(legacyTasksRef));
  if (!legacyTasksSnap.empty) {
    const batch = writeBatch(db);
    legacyTasksSnap.docs.forEach((docSnap) => {
      const taskData = docSnap.data();
      const taskRef = doc(db, COLLECTIONS.TASKS, docSnap.id);
      batch.set(taskRef, {
        ...taskData,
        id: taskData.id ?? docSnap.id,
        createdBy: taskData.createdBy || userId,
        sharedWith: ensureArray(taskData.sharedWith).length > 0
          ? taskData.sharedWith
          : [taskData.createdBy || userId]
      }, { merge: true });
    });
    await batch.commit();
  }

  await setDoc(configRef, {
    migratedToShared: true,
    migratedAt: serverTimestamp()
  }, { merge: true });

  if (legacyDocRef) {
    await setDoc(legacyDocRef, {
      migratedToShared: true,
      migratedAt: serverTimestamp()
    }, { merge: true });
  }
};

const getTasksCollectionRef = () => {
  return collection(db, COLLECTIONS.TASKS);
};

const ensureArray = (value) => Array.isArray(value) ? value : [];

const uniqueValues = (values) => Array.from(new Set(values.filter(Boolean)));

const normalizeTimestamp = (value) => {
  if (!value) return value;
  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }
  return value;
};

const mapTaskDoc = (taskDoc) => {
  const data = taskDoc.data();
  return {
    id: taskDoc.id,
    ...data,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt)
  };
};

/**
 * Guardar todos los datos del usuario en Firestore
 * Optimizado: Las colecciones se guardan en paralelo para mejor rendimiento
 */
export const saveUserDataToCloud = async (userId, data) => {
  if (!isFirebaseConfigured()) {
    console.log('Firebase no configurado, usando solo almacenamiento local');
    return { success: false, reason: 'not-configured' };
  }

  try {
    const userDocRef = getUserConfigDocRef(userId);
    const userData = data || createEmptyUserData();
    const version = Date.now();

    // Guardar config del usuario con retry
    await withRetry(async () => {
      await setDoc(userDocRef, {
        config: userData.config || {},
        updatedAt: serverTimestamp(),
        version
      }, { merge: true });
    }, 'saveUserConfig');

    // Guardar todas las colecciones EN PARALELO para mejor rendimiento
    await Promise.all([
      writeCollectionItems(userId, 'transactions', userData.transactions || []),
      writeCollectionItems(userId, 'clients', userData.clients || []),
      writeCollectionItems(userId, 'providers', userData.providers || []),
      writeCollectionItems(userId, 'employees', userData.employees || []),
      writeCollectionItems(userId, 'leads', userData.leads || []),
      writeCollectionItems(userId, 'invoices', userData.invoices || []),
      writeCollectionItems(userId, 'meetings', userData.meetings || [])
    ]);

    return { success: true, version };
  } catch (error) {
    console.error('Error guardando datos en la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cargar datos del usuario desde Firestore
 * Optimizado: Las colecciones se cargan en paralelo para mejor rendimiento
 */
export const loadUserDataFromCloud = async (userId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    await migrateLegacyUserData(userId);

    // Cargar config y colecciones EN PARALELO
    const [docSnap, ...collections] = await Promise.all([
      withRetry(() => getDoc(getUserConfigDocRef(userId)), 'loadUserConfig'),
      ...SHARED_DATA_COLLECTIONS.map((collectionName) =>
        readCollectionItems(userId, collectionName)
      )
    ]);

    const mapped = SHARED_DATA_COLLECTIONS.reduce((acc, collectionName, index) => {
      acc[collectionName] = collections[index];
      return acc;
    }, {});

    const hasCollectionData = SHARED_DATA_COLLECTIONS.some(
      (collectionName) => (mapped[collectionName] || []).length > 0
    );

    const data = docSnap.exists() ? docSnap.data() : null;

    if (!data && !hasCollectionData) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        ...createEmptyUserData(),
        ...mapped,
        config: data?.config || {}
      },
      version: data?.version
    };
  } catch (error) {
    console.error('Error cargando datos de la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Suscribirse a cambios en tiempo real
 * Incluye filtrado de elementos eliminados (soft delete)
 */
export const subscribeToUserData = (userId, callback) => {
  if (!isFirebaseConfigured()) {
    return () => { };
  }

  const currentData = createEmptyUserData();
  let currentVersion = 0;
  let debounceTimer = null;

  // Debounce notifications para evitar actualizaciones excesivas
  const notify = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      callback({
        ...currentData,
        version: currentVersion
      });
    }, 100); // 100ms de debounce
  };

  const userDocRef = getUserConfigDocRef(userId);
  const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentData.config = data.config || {};
      currentVersion = data.version || currentVersion;
      notify();
    }
  }, (error) => {
    console.error('Error en suscripción de usuario:', error);
  });

  // MODIFICACIÓN: Quitamos el filtro 'where("ownerId", "==", userId)'
  // Ahora traemos TODO para que sea visible por todo el equipo (consistente con readCollectionItems).
  const unsubscribes = SHARED_DATA_COLLECTIONS.map((collectionName) => {
    const collectionRef = getSharedCollectionRef(collectionName);
    return onSnapshot(collectionRef, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return { ...data, id: data.id ?? docSnap.id };
      });
      // Filtrar elementos eliminados (soft delete)
      currentData[collectionName] = filterDeleted(items);
      notify();
    }, (error) => {
      console.error(`Error en suscripción de ${collectionName}:`, error);
    });
  });

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    unsubscribeUser();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
};

/**
 * Cargar tareas del usuario desde Firestore (colección)
 * Incluye retry con backoff exponencial
 */
export const loadTasksFromCloud = async (userId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const tasks = await withRetry(async () => {
      const tasksQuery = query(
        getTasksCollectionRef()
      );
      const snapshot = await getDocs(tasksQuery);
      return snapshot.docs.map(mapTaskDoc);
    }, 'loadTasks');

    // Filtrar tareas eliminadas
    const activeTasks = filterDeleted(tasks);

    return { success: true, data: activeTasks };
  } catch (error) {
    console.error('Error cargando tareas de la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Suscribirse a cambios en tareas del usuario
 * Incluye filtrado de tareas eliminadas (soft delete)
 */
export const subscribeToTasks = (userId, callback) => {
  if (!isFirebaseConfigured()) {
    return () => { };
  }

  const tasksQuery = query(
    getTasksCollectionRef()
  );

  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(mapTaskDoc);
    // Filtrar tareas eliminadas (soft delete)
    callback(filterDeleted(tasks));
  }, (error) => {
    console.error('Error en suscripción de tareas:', error);
  });
};

/**
 * Crear o actualizar una tarea en Firestore
 */
export const saveTaskToCloud = async (userId, task) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const ownerId = task.createdBy || userId;
    const tasksCollectionRef = getTasksCollectionRef();
    const taskRef = task.id
      ? doc(tasksCollectionRef, task.id)
      : doc(tasksCollectionRef);

    const assignees = ensureArray(task.assignees);
    const sharedWith = uniqueValues([
      ownerId,
      ...ensureArray(task.sharedWith),
      ...assignees
    ]);

    const payload = {
      ...task,
      id: taskRef.id,
      createdBy: ownerId,
      assignees,
      sharedWith,
      createdAt: task.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(taskRef, payload, { merge: true });

    return { success: true, id: taskRef.id };
  } catch (error) {
    console.error('Error guardando tarea en la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Eliminar una tarea en Firestore
 */
export const deleteTaskFromCloud = async (userId, task) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const ownerId = task.createdBy || userId;
    const taskRef = doc(db, COLLECTIONS.TASKS, task.id);
    await deleteDoc(taskRef);
    return { success: true };
  } catch (error) {
    console.error('Error eliminando tarea en la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sincronizar datos locales con la nube (merge inteligente)
 */
export const syncDataWithCloud = async (userId, localData, localVersion) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    // Cargar datos de la nube
    const cloudResult = await loadUserDataFromCloud(userId);

    if (!cloudResult.success) {
      // Si no hay datos en la nube, subir los locales
      await saveUserDataToCloud(userId, localData);
      return { success: true, action: 'uploaded', data: localData };
    }

    if (!cloudResult.data) {
      // No hay datos en la nube, subir locales
      await saveUserDataToCloud(userId, localData);
      return { success: true, action: 'uploaded', data: localData };
    }

    const cloudVersion = cloudResult.version || 0;

    // Determinar qué datos son más recientes
    if (localVersion > cloudVersion) {
      // Datos locales son más recientes, subir a la nube
      await saveUserDataToCloud(userId, localData);
      return { success: true, action: 'uploaded', data: localData };
    } else if (cloudVersion > localVersion) {
      // Datos en la nube son más recientes, usar esos
      return { success: true, action: 'downloaded', data: cloudResult.data };
    }

    // Versiones iguales, hacer merge
    const mergedData = mergeData(localData, cloudResult.data);
    await saveUserDataToCloud(userId, mergedData);
    return { success: true, action: 'merged', data: mergedData };
  } catch (error) {
    console.error('Error sincronizando datos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Merge inteligente de datos (combina arrays sin duplicados por ID)
 * Usa normalizeUpdatedAt para comparar timestamps de diferentes formatos
 * @param {Object} localData - Datos locales
 * @param {Object} cloudData - Datos de la nube
 * @returns {Object} - Datos combinados con estadísticas de conflictos
 */
const mergeData = (localData, cloudData) => {
  let conflictCount = 0;

  const mergeArrays = (local = [], cloud = [], collectionName = '') => {
    const merged = new Map();

    // Agregar elementos locales
    local.forEach(item => {
      if (item?.id) {
        merged.set(item.id, { ...item, _source: 'local' });
      }
    });

    // Agregar o actualizar con elementos de la nube
    cloud.forEach(item => {
      if (item?.id) {
        const existing = merged.get(item.id);
        if (!existing) {
          merged.set(item.id, { ...item, _source: 'cloud' });
        } else {
          // Mantener el más reciente basado en updatedAt o fecha
          const localTime = normalizeUpdatedAt(existing.updatedAt) || normalizeUpdatedAt(existing.fecha);
          const cloudTime = normalizeUpdatedAt(item.updatedAt) || normalizeUpdatedAt(item.fecha);

<<<<<<< HEAD
          // Si el cloud tiene deleted: true y es mas reciente, se respeta
          // Si el local tiene deleted: true y es mas reciente, se respeta

=======
          // Detectar conflicto: ambos tienen cambios recientes (dentro de 5 segundos)
          const timeDiff = Math.abs(cloudTime - localTime);
          if (timeDiff < 5000 && timeDiff > 0) {
            conflictCount++;
            console.log(`[merge] Conflicto detectado en ${collectionName}:${item.id} (diff: ${timeDiff}ms)`);
          }

          // Si el cloud tiene deleted: true y es más reciente, se respeta
          // Si el local tiene deleted: true y es más reciente, se respeta
>>>>>>> 480946a521e684fed536578da0029da04b295d0b
          if (cloudTime > localTime) {
            merged.set(item.id, { ...item, _source: 'cloud' });
          }
        }
      }
    });

    // Limpiar _source antes de retornar
    return Array.from(merged.values()).map(({ _source, ...item }) => item);
  };

  const result = {
    transactions: mergeArrays(localData.transactions, cloudData.transactions, 'transactions'),
    clients: mergeArrays(localData.clients, cloudData.clients, 'clients'),
    providers: mergeArrays(localData.providers, cloudData.providers, 'providers'),
    employees: mergeArrays(localData.employees, cloudData.employees, 'employees'),
    leads: mergeArrays(localData.leads, cloudData.leads, 'leads'),
    invoices: mergeArrays(localData.invoices, cloudData.invoices, 'invoices'),
    meetings: mergeArrays(localData.meetings, cloudData.meetings, 'meetings'),
    config: { ...localData.config, ...cloudData.config }
  };

  if (conflictCount > 0) {
    console.log(`[merge] Total de conflictos detectados: ${conflictCount}`);
  }

  return result;
};

/**
 * Marcar un elemento como eliminado (soft delete)
 * Esto permite que la eliminación se sincronice correctamente entre usuarios
 * @param {string} userId - ID del usuario
 * @param {string} collectionName - Nombre de la colección
 * @param {string|number} itemId - ID del elemento a eliminar
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const softDeleteItem = async (userId, collectionName, itemId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const collectionRef = getSharedCollectionRef(collectionName);
    const docId = getSharedDocId(userId, String(itemId));
    const docRef = doc(collectionRef, docId);

    await withRetry(async () => {
      await setDoc(docRef, {
        deleted: true,
        deletedAt: Date.now(),
        deletedBy: userId,
        updatedAt: Date.now()
      }, { merge: true });
    }, `softDelete:${collectionName}:${itemId}`);

    return { success: true };
  } catch (error) {
    console.error(`Error eliminando ${collectionName}:${itemId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Restaurar un elemento eliminado
 * @param {string} userId - ID del usuario
 * @param {string} collectionName - Nombre de la colección
 * @param {string|number} itemId - ID del elemento a restaurar
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const restoreDeletedItem = async (userId, collectionName, itemId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const collectionRef = getSharedCollectionRef(collectionName);
    const docId = getSharedDocId(userId, String(itemId));
    const docRef = doc(collectionRef, docId);

    await withRetry(async () => {
      await setDoc(docRef, {
        deleted: false,
        restoredAt: Date.now(),
        restoredBy: userId,
        updatedAt: Date.now()
      }, { merge: true });
    }, `restore:${collectionName}:${itemId}`);

    return { success: true };
  } catch (error) {
    console.error(`Error restaurando ${collectionName}:${itemId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener estadísticas de sincronización
 * Útil para debugging y monitoreo
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getSyncStats = async (userId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const stats = {};

    await Promise.all(
      SHARED_DATA_COLLECTIONS.map(async (collectionName) => {
        const collectionRef = getSharedCollectionRef(collectionName);
        const snapshot = await getDocs(query(collectionRef));

        const items = snapshot.docs.map(doc => doc.data());
        const activeItems = items.filter(item => !item.deleted);
        const deletedItems = items.filter(item => item.deleted);
        const myItems = items.filter(item => item.ownerId === userId);

        stats[collectionName] = {
          total: items.length,
          active: activeItems.length,
          deleted: deletedItems.length,
          mine: myItems.length,
          shared: items.length - myItems.length
        };
      })
    );

    return { success: true, stats };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Exportar datos a JSON para backup
 */
export const exportDataToJSON = (data) => {
  const exportData = {
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookspace-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Importar datos desde JSON backup
 */
export const importDataFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Validar estructura básica
        if (!data || typeof data !== 'object') {
          throw new Error('Formato de archivo inválido');
        }

        resolve({
          success: true,
          data: {
            transactions: data.transactions || [],
            clients: data.clients || [],
            providers: data.providers || [],
            employees: data.employees || [],
            leads: data.leads || [],
            invoices: data.invoices || [],
            meetings: data.meetings || [],
            config: data.config || {}
          }
        });
      } catch (error) {
        reject({ success: false, error: 'Error al leer el archivo: ' + error.message });
      }
    };

    reader.onerror = () => {
      reject({ success: false, error: 'Error al leer el archivo' });
    };

    reader.readAsText(file);
  });
};
