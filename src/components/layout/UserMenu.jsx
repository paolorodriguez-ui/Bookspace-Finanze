import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Cloud, CloudOff, Settings, ChevronDown } from 'lucide-react';
import { SyncBadge } from '../auth/SyncIndicator';

/**
 * Menú de usuario con opciones de cuenta y sincronización
 */
export const UserMenu = ({
  user,
  isAuthenticated,
  syncStatus,
  onLogin,
  onLogout,
  onOpenSettings,
  companyName = 'Bookspace'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-4 border-l border-gray-100 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
      >
        <div className="w-9 h-9 bg-[#4f67eb] rounded-xl flex items-center justify-center text-white font-bold text-sm">
          {isAuthenticated && user?.displayName
            ? user.displayName.charAt(0).toUpperCase()
            : companyName?.charAt(0) || 'B'}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-[#2a1d89] truncate max-w-[120px]">
            {isAuthenticated ? (user?.displayName || user?.email?.split('@')[0]) : 'Sin cuenta'}
          </p>
          <div className="flex items-center gap-1">
            <SyncBadge status={syncStatus} isAuthenticated={isAuthenticated} />
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            {isAuthenticated ? (
              <>
                <p className="font-medium text-[#2a1d89]">
                  {user?.displayName || 'Usuario'}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Cloud className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600">
                    Sincronización activa
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium text-[#2a1d89]">Modo local</p>
                <p className="text-sm text-gray-500">
                  Los datos solo se guardan en este dispositivo
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <CloudOff className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-amber-600">
                    Sin sincronización
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            {!isAuthenticated ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogin();
                }}
                className="w-full px-4 py-2 text-left text-sm text-[#2a1d89] hover:bg-[#f8f9fc] flex items-center gap-3"
              >
                <User className="w-4 h-4 text-[#4f67eb]" />
                Iniciar sesión
                <span className="ml-auto text-xs text-[#4f67eb] bg-[#4f67eb]/10 px-2 py-0.5 rounded-full">
                  Sincronizar
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-[#2a1d89] hover:bg-[#f8f9fc] flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" />
                  Configuración de cuenta
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </>
            )}
          </div>

          {/* Help text */}
          {!isAuthenticated && (
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Inicia sesión para sincronizar tus datos y acceder desde cualquier dispositivo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
