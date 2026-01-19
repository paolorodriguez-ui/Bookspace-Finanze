# 💼 Bookspace Finanze - Sistema ERP/CRM

Sistema completo de gestión financiera y CRM para pequeños negocios, especializado en la gestión de venues para eventos.

## 🌟 Características

### 📊 Gestión Financiera
- **Transacciones**: Registro completo de ingresos y egresos
- **Balance General**: Vista detallada de efectivo, banco, cuentas por cobrar/pagar
- **Análisis por Categorías**: Clasificación de ingresos y gastos
- **Métricas Avanzadas**: ROI, margen bruto, liquidez, proyecciones
- **Reportes Mensuales**: Análisis de flujo de efectivo mes a mes

### 🎯 CRM
- **Gestión de Leads**: Pipeline visual de prospectos
- **Estados del Pipeline**: Nuevo → Contactado → Interesado → Negociación → Cerrado
- **Juntas Programadas**: Seguimiento de reuniones con prospectos
- **Conversión a Clientes**: Workflow automático
- **Métricas de Conversión**: Tasa de éxito y potencial de ingresos

### 📄 Facturación
- **Facturas Completas**: Multi-conceptos con IVA automático
- **Estados**: Borrador, Pendiente, Pagada, Cancelada
- **Impresión**: Generación de PDF para impresión
- **Seguimiento**: Control de facturas pendientes y cobradas

### 👥 Gestión de Contactos
- **Clientes**: Base de datos completa con RFC y contacto
- **Proveedores**: Información bancaria y fiscal
- **Empleados**: Nómina y salarios

### 📤 Exportación
- **CSV**: Compatible con Excel
- **JSON**: Para APIs y análisis
- **Respaldo Completo**: Exportación total del sistema

### ☁️ Sincronización en la Nube
- **Multi-dispositivo**: Accede desde cualquier computadora
- **Sincronización automática**: Cambios sincronizados en tiempo real
- **Modo offline**: Funciona sin internet, sincroniza al reconectar
- **Autenticación segura**: Login con email y contraseña
- **Datos privados**: Cada usuario solo ve sus propios datos

## 🏗️ Arquitectura

### Estructura del Proyecto

```
Bookspace-Finanze/
├── BookspaceERP-v5.jsx          # Archivo original monolítico
├── src/
│   ├── components/
│   │   └── common/              # Componentes reutilizables
│   ├── hooks/                   # React hooks personalizados
│   ├── utils/                   # Utilidades y helpers
│   └── constants/               # Constantes del proyecto
├── MEJORAS_FASE_1.md            # Documentación de mejoras
├── GUIA_RAPIDA.md               # Guía de uso rápido
└── README.md                    # Este archivo
```

### Stack Tecnológico

- **Framework**: React 18
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Storage local**: IndexedDB + localStorage
- **Sincronización**: Firebase (Firestore + Auth)
- **Tipografía**: Plus Jakarta Sans

## 🚀 Mejoras Implementadas (Fase 1)

### ✅ Modularización
- Código organizado en módulos pequeños y mantenibles
- Separación de responsabilidades clara
- Fácil navegación y debugging

### ✅ Sistema de Validación
- Validadores para todos los tipos de datos
- Mensajes de error descriptivos
- Validación de RFC, email, teléfono, fechas

### ✅ Manejo de Errores
- Sistema robusto de error handling
- StorageError personalizado
- Retry logic para operaciones críticas

### ✅ Componentes Optimizados
- React.memo() para prevenir re-renders
- Componentes reutilizables documentados
- Props bien tipadas con JSDoc

### ✅ Utilidades Organizadas
- Formatters: Moneda, fechas, teléfonos
- Calculations: Todos los cálculos financieros
- Export: CSV, JSON, impresión

### ✅ Hooks Personalizados
- `usePagination`: Paginación completa
- `useStorage`: Manejo automático de storage

## 📖 Documentación

### Guías Disponibles

1. **[MEJORAS_FASE_1.md](./MEJORAS_FASE_1.md)** - Documentación completa de mejoras
2. **[GUIA_RAPIDA.md](./GUIA_RAPIDA.md)** - Guía de uso rápido con ejemplos
3. **[docs/data-model.md](./docs/data-model.md)** - Contrato de datos y sincronización (`updatedAt`)

### Inicio Rápido

```javascript
// 1. Importar componentes
import { StatCard, Pagination } from './src/components/common';

// 2. Importar utilidades
import { formatCurrency, validateLead } from './src/utils';

// 3. Importar hooks
import { usePagination } from './src/hooks';

// 4. Usar en tu componente
const { paginatedData } = usePagination(transactions, 20);
```

## ☁️ Configurar Sincronización en la Nube

Para habilitar la sincronización entre dispositivos, necesitas configurar Firebase:

1. Sigue la guía completa en **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**
2. Crea un archivo `.env` con tus credenciales
3. Reinicia la aplicación

Una vez configurado, podrás:
- Crear una cuenta o iniciar sesión
- Ver tus datos sincronizados en cualquier dispositivo
- Trabajar offline y sincronizar al reconectar

## 🎯 Próximos Pasos

### Fase 2 - Importante (Próximamente)
- [ ] Migración a TypeScript
- [ ] Búsqueda global funcional
- [ ] Vista Kanban en CRM
- [ ] Modo oscuro
- [x] ~~Backup en la nube~~ (Completado)

### Fase 3 - Mejoras
- [ ] Atajos de teclado
- [ ] Reportes avanzados con gráficos
- [ ] Recordatorios y notificaciones
- [ ] Onboarding interactivo
- [ ] Optimizaciones de rendimiento

### Fase 4 - Innovación
- [ ] Integraciones externas (Bancos, Email)
- [ ] Multi-usuario con roles
- [ ] Predicciones con ML
- [ ] App mobile nativa
- [ ] API pública

## 🔧 Desarrollo

### Estructura de Módulos

**Constantes** (`src/constants/`)
- Todas las constantes centralizadas
- Categorías, estados, planes, etc.

**Utilidades** (`src/utils/`)
- `formatters.js` - Formateo de datos
- `validators.js` - Validaciones completas
- `calculations.js` - Cálculos financieros
- `storage.js` - Operaciones de storage
- `errorHandling.js` - Manejo de errores
- `export.js` - Exportación de datos

**Componentes** (`src/components/common/`)
- Componentes UI reutilizables
- Optimizados con React.memo()
- Documentados con JSDoc

**Hooks** (`src/hooks/`)
- `usePagination` - Paginación
- `useStorage` - Storage automático

## ☁️ Deploy en Vercel

1. Instala dependencias:

```bash
npm install
```

2. Corre el proyecto en local:

```bash
npm run dev
```

3. Para producción (Vercel usa estos comandos por defecto):

```bash
npm run build
```

La salida se genera en la carpeta `dist`, lista para publicar en Vercel.

## 📊 Características Destacadas

### Validación Robusta
```javascript
import { validateLead, validateInvoice } from './src/utils/validators';

const { isValid, errors } = validateLead(lead);
if (!isValid) {
  errors.forEach(error => notify(error, 'error'));
}
```

### Paginación Automática
```javascript
import { usePagination } from './src/hooks';

const { paginatedData, currentPage, totalPages } =
  usePagination(transactions, 20);
```

### Manejo de Errores
```javascript
import { handleError } from './src/utils/errorHandling';

try {
  await saveData();
} catch (error) {
  handleError(error, 'saveData', notify);
}
```

### Exportación Avanzada
```javascript
import { exportToCSV, downloadFile } from './src/utils/export';

const blob = exportToCSV(data, headers, mapFn);
downloadFile(blob, 'export.csv');
```

## 🎨 Diseño

### Paleta de Colores
- **Primario**: `#4f67eb` (Azul Bookspace)
- **Secundario**: `#2a1d89` (Azul oscuro)
- **Éxito**: `emerald-500/600`
- **Peligro**: `red-500/600`
- **Advertencia**: `amber-500/600`
- **Neutro**: `#b7bac3` (Gris)
- **Fondo**: `#f8f9fc` (Gris claro)

### Componentes Visuales
- Cards con sombras suaves
- Bordes redondeados (12-16px)
- Transiciones suaves
- Hover states bien definidos
- Iconos de Lucide React

## 💡 Mejores Prácticas

1. **Siempre validar** antes de guardar datos
2. **Usar paginación** para listas grandes (>20 items)
3. **Manejar errores** en todas las operaciones async
4. **Formatear datos** antes de mostrar al usuario
5. **Reutilizar componentes** cuando sea posible
6. **Documentar funciones** con JSDoc

## 🐛 Troubleshooting

### StorageError
- Verifica que `window.storage` esté disponible
- Revisa permisos del navegador
- Comprueba tamaño de datos (límites de storage)

### ValidationError
- Revisa que los campos requeridos estén presentes
- Valida formatos (email, RFC, teléfono)
- Comprueba tipos de datos (números, fechas)

### Performance
- Usa paginación para listas >20 items
- Verifica que los componentes estén memoizados
- Revisa que no haya loops infinitos en useEffect

## 📝 Changelog

### v1.1.0 - Enero 2026 (Sincronización)
- ✅ Sincronización en la nube con Firebase
- ✅ Autenticación de usuarios (registro/login)
- ✅ Acceso multi-dispositivo
- ✅ Modo offline con sincronización automática
- ✅ Indicadores de estado de sincronización
- ✅ Menú de usuario mejorado

### v1.0.0 - Enero 2026 (FASE 1)
- ✅ Modularización completa del código
- ✅ Sistema de validación robusto
- ✅ Manejo de errores mejorado
- ✅ Componentes optimizados con React.memo()
- ✅ Hooks personalizados (usePagination, useStorage)
- ✅ Utilidades organizadas y documentadas
- ✅ Paginación implementada
- ✅ EmptyState y LoadingSpinner
- ✅ Documentación completa

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y pertenece a Bookspace.

## 👥 Equipo

Desarrollado para la gestión eficiente de venues y eventos.

## 🙏 Agradecimientos

- React team por el excelente framework
- Tailwind CSS por el sistema de estilos
- Lucide por los iconos
- Plus Jakarta Sans por la tipografía

---

**Versión**: 1.0.0 (FASE 1 Completada)
**Última actualización**: Enero 2026

Para más información, consulta:
- [Documentación de Mejoras](./MEJORAS_FASE_1.md)
- [Guía Rápida](./GUIA_RAPIDA.md)
