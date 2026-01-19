import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const env = import.meta.env;
const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
];
const hasFirebaseConfig = requiredKeys.every((key) => Boolean(env[key]));

// Configuración de Firebase - se llena desde variables de entorno
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase
let app;
let db;
let auth;

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Habilitar persistencia offline para que funcione sin conexión
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistencia offline no disponible: múltiples pestañas abiertas');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistencia offline no soportada por este navegador');
      }
    });
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
  }
} else {
  console.warn('Firebase no está configurado. Agrega las variables VITE_FIREBASE_* en tu entorno.');
}

export { app, db, auth };
export const isFirebaseConfigured = () => hasFirebaseConfig;
