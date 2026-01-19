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
  collectionGroup,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

/**
 * Nombres de las colecciones en Firestore
 */
const COLLECTIONS = {
  USERS_DATA: 'users_data',
  USERS: 'users',
  TASKS: 'tasks',
  WORKSPACES: 'workspaces'
};

const USER_SUBCOLLECTIONS = [
  'transactions',
  'clients',
  'providers',
  'employees',
  'leads',
  'invoices',
  'meetings'
];

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

const getUserDocRef = (userId) => doc(db, COLLECTIONS.USERS, userId);

const getLegacyUserDocRef = (userId) => doc(db, COLLECTIONS.USERS_DATA, userId);

const getUserCollectionRef = (userId, collectionName) => (
  collection(db, COLLECTIONS.USERS, userId, collectionName)
);

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
  if (!items.length) return;

  const chunkSize = 400;
  const batches = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + chunkSize);

    chunk.forEach((item) => {
      const docId = getValidDocId(item);
      if (!docId) {
        console.warn(`Item sin id en ${collectionName}, omitido`, item);
        return;
      }
      const docRef = doc(getUserCollectionRef(userId, collectionName), docId);
      batch.set(docRef, { ...item, id: docId }, { merge: true });
    });

    batches.push(batch);
  }

  await commitBatchWrites(batches);
};

const readCollectionItems = async (userId, collectionName) => {
  const collectionRef = getUserCollectionRef(userId, collectionName);
  const snapshot = await getDocs(query(collectionRef));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return { ...data, id: data.id ?? docSnap.id };
  });
};

const migrateLegacyUserData = async (userId) => {
  const legacyDocRef = getLegacyUserDocRef(userId);
  const legacySnap = await getDoc(legacyDocRef);

  if (!legacySnap.exists()) {
    return;
  }

  const legacyData = legacySnap.data();

  if (legacyData?.migratedToUsers) {
    return;
  }

  const dataToMigrate = {
    ...createEmptyUserData(),
    transactions: legacyData.transactions || [],
    clients: legacyData.clients || [],
    providers: legacyData.providers || [],
    employees: legacyData.employees || [],
    leads: legacyData.leads || [],
    invoices: legacyData.invoices || [],
    meetings: legacyData.meetings || [],
    config: legacyData.config || {}
  };

  await saveUserDataToCloud(userId, dataToMigrate);

  await setDoc(legacyDocRef, {
    migratedToUsers: true,
    migratedAt: serverTimestamp()
  }, { merge: true });
};

const getUserTasksCollectionRef = (userId) => {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.TASKS);
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
 */
export const saveUserDataToCloud = async (userId, data) => {
  if (!isFirebaseConfigured()) {
    console.log('Firebase no configurado, usando solo almacenamiento local');
    return { success: false, reason: 'not-configured' };
  }

  try {
    const userDocRef = getUserDocRef(userId);
    const userData = data || createEmptyUserData();

    await setDoc(userDocRef, {
      config: userData.config || {},
      updatedAt: serverTimestamp(),
      version: Date.now()
    }, { merge: true });

    await writeCollectionItems(userId, 'transactions', userData.transactions || []);
    await writeCollectionItems(userId, 'clients', userData.clients || []);
    await writeCollectionItems(userId, 'providers', userData.providers || []);
    await writeCollectionItems(userId, 'employees', userData.employees || []);
    await writeCollectionItems(userId, 'leads', userData.leads || []);
    await writeCollectionItems(userId, 'invoices', userData.invoices || []);
    await writeCollectionItems(userId, 'meetings', userData.meetings || []);

    return { success: true };
  } catch (error) {
    console.error('Error guardando datos en la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cargar datos del usuario desde Firestore
 */
export const loadUserDataFromCloud = async (userId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    await migrateLegacyUserData(userId);

    const userDocRef = getUserDocRef(userId);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      return { success: true, data: null };
    }

    const data = docSnap.data();
    const collections = await Promise.all(
      USER_SUBCOLLECTIONS.map((collectionName) => readCollectionItems(userId, collectionName))
    );

    const mapped = USER_SUBCOLLECTIONS.reduce((acc, collectionName, index) => {
      acc[collectionName] = collections[index];
      return acc;
    }, {});

    return {
      success: true,
      data: {
        ...createEmptyUserData(),
        ...mapped,
        config: data.config || {}
      },
      version: data.version
    };
  } catch (error) {
    console.error('Error cargando datos de la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Suscribirse a cambios en tiempo real
 */
export const subscribeToUserData = (userId, callback) => {
  if (!isFirebaseConfigured()) {
    return () => {};
  }

  const currentData = createEmptyUserData();
  let currentVersion = 0;

  const notify = () => {
    callback({
      ...currentData,
      version: currentVersion
    });
  };

  const userDocRef = getUserDocRef(userId);
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

  const unsubscribes = USER_SUBCOLLECTIONS.map((collectionName) => {
    const collectionRef = getUserCollectionRef(userId, collectionName);
    return onSnapshot(collectionRef, (snapshot) => {
      currentData[collectionName] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return { ...data, id: data.id ?? docSnap.id };
      });
      notify();
    }, (error) => {
      console.error(`Error en suscripción de ${collectionName}:`, error);
    });
  });

  return () => {
    unsubscribeUser();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
};

/**
 * Cargar tareas del usuario desde Firestore (colección)
 */
export const loadTasksFromCloud = async (userId) => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const tasksQuery = query(
      collectionGroup(db, COLLECTIONS.TASKS),
      where('sharedWith', 'array-contains', userId)
    );
    const snapshot = await getDocs(tasksQuery);
    const tasks = snapshot.docs.map(mapTaskDoc);

    return { success: true, data: tasks };
  } catch (error) {
    console.error('Error cargando tareas de la nube:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Suscribirse a cambios en tareas del usuario
 */
export const subscribeToTasks = (userId, callback) => {
  if (!isFirebaseConfigured()) {
    return () => {};
  }

  const tasksQuery = query(
    collectionGroup(db, COLLECTIONS.TASKS),
    where('sharedWith', 'array-contains', userId)
  );

  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(mapTaskDoc);
    callback(tasks);
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
    const tasksCollectionRef = getUserTasksCollectionRef(ownerId);
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
    const taskRef = doc(db, COLLECTIONS.USERS, ownerId, COLLECTIONS.TASKS, task.id);
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
 */
const mergeData = (localData, cloudData) => {
  const mergeArrays = (local = [], cloud = []) => {
    const merged = new Map();
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

    // Agregar elementos locales
    local.forEach(item => {
      if (item.id) {
        merged.set(item.id, item);
      }
    });

    // Agregar o actualizar con elementos de la nube
    cloud.forEach(item => {
      if (item.id) {
        const existing = merged.get(item.id);
        if (!existing) {
          merged.set(item.id, item);
        } else {
          // Mantener el más reciente basado en updatedAt o fecha
          const localTime = normalizeUpdatedAt(existing.updatedAt) || normalizeUpdatedAt(existing.fecha);
          const cloudTime = normalizeUpdatedAt(item.updatedAt) || normalizeUpdatedAt(item.fecha);
          if (cloudTime > localTime) {
            merged.set(item.id, item);
          }
        }
      }
    });

    return Array.from(merged.values());
  };

  return {
    transactions: mergeArrays(localData.transactions, cloudData.transactions),
    clients: mergeArrays(localData.clients, cloudData.clients),
    providers: mergeArrays(localData.providers, cloudData.providers),
    employees: mergeArrays(localData.employees, cloudData.employees),
    leads: mergeArrays(localData.leads, cloudData.leads),
    invoices: mergeArrays(localData.invoices, cloudData.invoices),
    meetings: mergeArrays(localData.meetings, cloudData.meetings),
    config: { ...localData.config, ...cloudData.config }
  };
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
