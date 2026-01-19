import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { SYNC_STATUS } from '../../hooks/useCloudSync';

/**
 * Indicador visual del estado de sincronización
 */
export const SyncIndicator = ({ status, lastSyncTime, error, onRetry }) => {
  const getStatusConfig = () => {
    switch (status) {
      case SYNC_STATUS.SYNCING:
        return {
          icon: RefreshCw,
          text: 'Sincronizando...',
          className: 'text-blue-600 bg-blue-50',
          animate: true
        };
      case SYNC_STATUS.SYNCED:
        return {
          icon: CheckCircle,
          text: 'Sincronizado',
          className: 'text-green-600 bg-green-50',
          animate: false
        };
      case SYNC_STATUS.ERROR:
        return {
          icon: AlertCircle,
          text: 'Error de sincronización',
          className: 'text-red-600 bg-red-50',
          animate: false
        };
      case SYNC_STATUS.OFFLINE:
        return {
          icon: WifiOff,
          text: 'Sin conexión',
          className: 'text-amber-600 bg-amber-50',
          animate: false
        };
      default:
        return {
          icon: Cloud,
          text: 'Listo',
          className: 'text-gray-600 bg-gray-50',
          animate: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className={`w-3.5 h-3.5 ${config.animate ? 'animate-spin' : ''}`} />
      <span>{config.text}</span>
      {lastSyncTime && status === SYNC_STATUS.SYNCED && (
        <span className="text-xs opacity-70">
          {formatTime(lastSyncTime)}
        </span>
      )}
      {status === SYNC_STATUS.ERROR && onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 hover:underline"
          title={error}
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

/**
 * Badge pequeño para mostrar en la barra de navegación
 */
export const SyncBadge = ({ status, isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <CloudOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Local</span>
      </div>
    );
  }

  const getConfig = () => {
    switch (status) {
      case SYNC_STATUS.SYNCING:
        return { icon: RefreshCw, color: 'text-blue-500', animate: true };
      case SYNC_STATUS.SYNCED:
        return { icon: Cloud, color: 'text-green-500', animate: false };
      case SYNC_STATUS.ERROR:
        return { icon: AlertCircle, color: 'text-red-500', animate: false };
      case SYNC_STATUS.OFFLINE:
        return { icon: WifiOff, color: 'text-amber-500', animate: false };
      default:
        return { icon: Cloud, color: 'text-gray-400', animate: false };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center ${config.color}`}>
      <Icon className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} />
    </div>
  );
};
