import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const mapUserDoc = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    uid: docSnap.id,
    displayName: data.displayName || '',
    email: data.email || ''
  };
};

export const loadUsersFromCloud = async () => {
  if (!isFirebaseConfigured()) {
    return { success: false, reason: 'not-configured' };
  }

  try {
    const snapshot = await getDocs(collection(db, 'profiles'));
    return { success: true, data: snapshot.docs.map(mapUserDoc) };
  } catch (error) {
    console.error('Error cargando usuarios de la nube:', error);
    return { success: false, error: error.message };
  }
};

export const subscribeToUsers = (callback) => {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }

  const usersRef = collection(db, 'profiles');
  return onSnapshot(usersRef, (snapshot) => {
    callback(snapshot.docs.map(mapUserDoc));
  }, (error) => {
    console.error('Error en suscripción de usuarios:', error);
  });
};
