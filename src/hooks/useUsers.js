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
      const response = await loadUsersFromCloud();

      if (!isMounted) return;

      if (response.success) {
        setUsers(response.data || []);
        setError(null);
      } else {
        if (response.reason !== 'not-configured') {
          setError(response.error || 'No se pudieron cargar usuarios');
        }
      }
      setLoading(false);
    };

    load();
    unsubscribe = subscribeToUsers((data) => {
      if (!isMounted) return;
      setUsers(data || []);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [enabled]);

  return { users, loading, error };
};
