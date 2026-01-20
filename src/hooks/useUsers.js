import { useEffect, useState } from 'react';
import { loadUsersFromCloud, subscribeToUsers } from '../firebase';

export const useUsers = ({ enabled = true } = {}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return () => { };
    }

    let unsubscribe = () => { };
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      console.log('useUsers: Inicianado carga de usuarios...');
      const response = await loadUsersFromCloud();

      if (!isMounted) return;

      if (response.success) {
        console.log('useUsers: Usuarios cargados:', response.data?.length);
        setUsers(response.data || []);
        setError(null);
      } else {
        console.error('useUsers: Error cargando usuarios:', response);
        if (response.reason !== 'not-configured') {
          setError(response.error || 'No se pudieron cargar usuarios');
        }
      }
      setLoading(false);
    };

    load();
    unsubscribe = subscribeToUsers((data) => {
      if (!isMounted) return;
      console.log('useUsers: Actualización en tiempo real:', data?.length);
      setUsers(data || []);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [enabled]);

  return { users, loading, error };
};
