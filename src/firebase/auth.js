import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';

const upsertUserProfile = async ({ uid, displayName, email }) => {
  if (!db) return;
  const userRef = doc(db, 'profiles', uid);
  await setDoc(userRef, {
    displayName: displayName || '',
    email: email || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    active: true
  }, { merge: true });
};

/**
 * Registrar un nuevo usuario
 */
export const registerUser = async (email, password, displayName) => {
  if (!auth || !isFirebaseConfigured()) {
    return {
      success: false,
      error: getAuthErrorMessage('auth/configuration-not-found')
    };
  }
  try {
    console.log('Intentando registrar usuario:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Usuario creado exitosamente:', userCredential.user.uid);

    // Actualizar el nombre de usuario (no crítico si falla)
    if (displayName) {
      try {
        await updateProfile(userCredential.user, { displayName });
        console.log('Perfil actualizado con nombre:', displayName);
      } catch (profileError) {
        console.warn('No se pudo actualizar el nombre de perfil:', profileError.message);
        // No fallamos el registro si solo falla el nombre
      }
    }

    try {
      await upsertUserProfile({
        uid: userCredential.user.uid,
        displayName: displayName || userCredential.user.displayName || '',
        email: userCredential.user.email || email || ''
      });
    } catch (profileError) {
      console.warn('No se pudo crear el perfil público:', profileError.message);
    }

    return {
      success: true,
      user: userCredential.user,
      message: 'Cuenta creada exitosamente'
    };
  } catch (error) {
    console.error('Error en registro:', error.code, error.message);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

/**
 * Iniciar sesión
 */
export const loginUser = async (email, password) => {
  if (!auth || !isFirebaseConfigured()) {
    return {
      success: false,
      error: getAuthErrorMessage('auth/configuration-not-found')
    };
  }
  try {
    console.log('Intentando iniciar sesión:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Sesión iniciada exitosamente:', userCredential.user.uid);
    return {
      success: true,
      user: userCredential.user,
      message: 'Sesión iniciada'
    };
  } catch (error) {
    console.error('Error en login:', error.code, error.message);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

/**
 * Cerrar sesión
 */
export const logoutUser = async () => {
  if (!auth || !isFirebaseConfigured()) {
    return { success: false, error: getAuthErrorMessage('auth/configuration-not-found') };
  }
  try {
    await signOut(auth);
    return { success: true, message: 'Sesión cerrada' };
  } catch (error) {
    return { success: false, error: 'Error al cerrar sesión' };
  }
};

/**
 * Enviar email de recuperación de contraseña
 */
export const resetPassword = async (email) => {
  if (!auth || !isFirebaseConfigured()) {
    return {
      success: false,
      error: getAuthErrorMessage('auth/configuration-not-found')
    };
  }
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Email de recuperación enviado'
    };
  } catch (error) {
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

/**
 * Suscribirse a cambios de autenticación
 */
export const subscribeToAuthChanges = (callback) => {
  if (!auth || !isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

/**
 * Obtener usuario actual
 */
export const getCurrentUser = () => {
  if (!auth || !isFirebaseConfigured()) {
    return null;
  }
  return auth.currentUser;
};

/**
 * Traducir errores de Firebase Auth a español
 */
const getAuthErrorMessage = (errorCode) => {
  const errorMessages = {
    // Errores de registro
    'auth/email-already-in-use': 'Este email ya está registrado. Intenta iniciar sesión.',
    'auth/invalid-email': 'Email inválido',
    'auth/operation-not-allowed': 'Operación no permitida. Verifica la configuración de Firebase.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',

    // Errores de login
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Email o contraseña incorrectos',
    'auth/invalid-login-credentials': 'Email o contraseña incorrectos',

    // Errores de límite
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',

    // Errores de red/conexión
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/internal-error': 'Error interno. Intenta de nuevo.',
    'auth/timeout': 'La solicitud tardó demasiado. Intenta de nuevo.',

    // Errores de configuración
    'auth/configuration-not-found': 'Firebase no está configurado correctamente',
    'auth/invalid-api-key': 'La API key de Firebase es inválida',
    'auth/app-not-authorized': 'La app no está autorizada para usar Firebase Auth',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase',

    // Errores de sesión
    'auth/requires-recent-login': 'Por seguridad, inicia sesión de nuevo',
    'auth/user-token-expired': 'Tu sesión expiró. Inicia sesión de nuevo.',

    // Otros errores comunes
    'auth/missing-email': 'El email es requerido',
    'auth/missing-password': 'La contraseña es requerida',
    'auth/popup-closed-by-user': 'La ventana de autenticación fue cerrada',
    'auth/cancelled-popup-request': 'Solicitud cancelada'
  };

  if (errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Log para debugging de errores desconocidos
  console.warn('Firebase Auth - Código de error no mapeado:', errorCode);
  return `Error de autenticación (${errorCode || 'desconocido'})`;
};
