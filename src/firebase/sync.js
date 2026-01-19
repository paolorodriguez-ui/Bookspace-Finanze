import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

/**
 * Nombres de las colecciones en Firestore
 */
const COLLECTIONS = {
  USERS_DATA: 'users_data'
};

/**
 * Obtener referencia al documento del usuario
 */
const getUserDocRef = (userId) => {
  return doc(db, COLLECTIONS.USERS_DATA, userId);
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

    await setDoc(userDocRef, {
      transactions: data.transactions || [],
      clients: data.clients || [],
      providers: data.providers || [],
      employees: data.employees || [],
      leads: data.leads || [],
      invoices: data.invoices || [],
      meetings: data.meetings || [],
      config: data.config || {},
      updatedAt: serverTimestamp(),
      version: Date.now()
    }, { merge: true });

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
    const userDocRef = getUserDocRef(userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
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
        },
        version: data.version
      };
    }

    return { success: true, data: null };
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

  const userDocRef = getUserDocRef(userId);

  return onSnapshot(userDocRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        transactions: data.transactions || [],
        clients: data.clients || [],
        providers: data.providers || [],
        employees: data.employees || [],
        leads: data.leads || [],
        invoices: data.invoices || [],
        meetings: data.meetings || [],
        config: data.config || {},
        version: data.version
      });
    }
  }, (error) => {
    console.error('Error en suscripción de datos:', error);
  });
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
          const localTime = existing.updatedAt || existing.fecha || 0;
          const cloudTime = item.updatedAt || item.fecha || 0;
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
