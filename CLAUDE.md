# CLAUDE.md - AI Assistant Guide for Bookspace Finanze

**Last Updated**: January 2026
**Project Version**: 1.1.0
**Purpose**: This document provides comprehensive guidance for AI assistants (like Claude) working on the Bookspace Finanze codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Codebase Architecture](#codebase-architecture)
4. [Development Workflows](#development-workflows)
5. [Code Conventions](#code-conventions)
6. [Firebase & Cloud Sync](#firebase--cloud-sync)
7. [Data Models](#data-models)
8. [Key Patterns & Best Practices](#key-patterns--best-practices)
9. [Testing & Quality](#testing--quality)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Bookspace Finanze** is a comprehensive ERP/CRM system for small businesses specializing in venue management for events. It provides:

- **Financial Management**: Complete transaction tracking, balance calculations, metrics
- **CRM Pipeline**: Lead management with visual pipeline stages
- **Invoicing**: Multi-item invoices with automatic IVA (tax) calculations
- **Contact Management**: Clients, providers, and employees
- **Cloud Sync**: Real-time multi-device synchronization via Firebase
- **Offline-First**: Works offline with IndexedDB, syncs when online

### Key Features
- Multi-user collaboration (shared data collections)
- Activity logging and audit trail
- Export to CSV/JSON
- Spanish language (México)
- Mexican currency (MXN) and date formats
- Mobile-responsive Tailwind UI

### Project Goals
- **Maintainability**: Clean, modular code structure
- **Performance**: Optimized with memoization, pagination, debouncing
- **Reliability**: Robust error handling and validation
- **Scalability**: Built to handle growth in users and data

---

## Technology Stack

### Core Technologies
```json
{
  "framework": "React 18.3.1",
  "build_tool": "Vite 5.4.2",
  "styling": "Tailwind CSS 3.4.10",
  "icons": "Lucide React 0.536.0",
  "backend": "Firebase 12.8.0 (Firestore + Auth)",
  "storage": "IndexedDB + localStorage (dual-layer)",
  "deployment": "Vercel"
}
```

### Dependencies

**Production**:
- `react@18.3.1` & `react-dom@18.3.1` - UI framework
- `firebase@12.8.0` - Cloud backend (Firestore, Auth)
- `lucide-react@0.536.0` - Icon library

**Development**:
- `@vitejs/plugin-react@4.3.1` - Vite React plugin
- `tailwindcss@3.4.10` - Utility-first CSS
- `autoprefixer@10.4.20` - CSS vendor prefixing
- `postcss@8.4.41` - CSS processing

### Build Commands
```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

---

## Codebase Architecture

### Directory Structure

```
Bookspace-Finanze/
├── src/
│   ├── main.jsx                      # React entry point
│   ├── App.jsx                       # App wrapper component
│   ├── BookspaceERP.jsx              # Main app component (~3,200 lines)
│   ├── storage.js                    # IndexedDB/localStorage adapter
│   ├── index.css                     # Global styles + Tailwind
│   │
│   ├── components/                   # UI Components
│   │   ├── auth/                     # Authentication components
│   │   │   ├── AuthModal.jsx         # Login/Register modal
│   │   │   └── SyncIndicator.jsx     # Cloud sync status
│   │   ├── calendar/
│   │   │   └── MeetingsCalendar.jsx  # Calendar view
│   │   ├── common/                   # Reusable components
│   │   │   ├── BookspaceLogo.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ExportMenu.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Notification.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   └── StatCard.jsx
│   │   ├── layout/
│   │   │   └── UserMenu.jsx          # User profile dropdown
│   │   └── tasks/
│   │       └── TasksBoard.jsx        # Task management
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.js                # Authentication state
│   │   ├── useCloudSync.js           # Cloud sync logic
│   │   ├── useActivityLog.js         # Activity tracking
│   │   ├── usePagination.js          # Pagination
│   │   ├── useStorage.js             # Local storage
│   │   └── useUsers.js               # Multi-user management
│   │
│   ├── firebase/                     # Firebase integration
│   │   ├── config.js                 # Firebase initialization
│   │   ├── auth.js                   # Auth functions
│   │   ├── sync.js                   # Data sync
│   │   ├── activityLog.js            # Activity logging
│   │   └── users.js                  # User profiles
│   │
│   ├── utils/                        # Utility functions
│   │   ├── calculations.js           # Financial calculations
│   │   ├── formatters.js             # Data formatting
│   │   ├── validators.js             # Input validation
│   │   ├── storage.js                # Storage operations
│   │   ├── errorHandling.js          # Error handling
│   │   └── export.js                 # CSV/JSON export
│   │
│   └── constants/
│       └── index.js                  # App constants
│
├── docs/
│   └── data-model.md                 # Data model documentation
│
├── public/                           # Static assets
├── index.html                        # HTML entry point
├── package.json                      # Dependencies
├── vite.config.js                    # Vite configuration
├── tailwind.config.js                # Tailwind configuration
├── postcss.config.js                 # PostCSS configuration
├── firestore.rules                   # Firestore security rules
├── vercel.json                       # Vercel deployment config
├── .env.example                      # Environment variables template
│
└── Documentation files
    ├── README.md                     # Project overview
    ├── FIREBASE_SETUP.md            # Firebase setup guide
    ├── GUIA_RAPIDA.md               # Quick start guide (Spanish)
    ├── MEJORAS_FASE_1.md            # Phase 1 improvements
    ├── DEPENDENCY_AUDIT.md          # Dependency analysis
    └── CLAUDE.md                    # This file
```

### Component Hierarchy

```
App.jsx
└── BookspaceERP.jsx (main app component)
    ├── AuthModal (login/register)
    ├── SyncIndicator (cloud status)
    ├── UserMenu (profile dropdown)
    ├── ActivityLog (activity widget)
    ├── Dashboard (financial overview)
    ├── CRM Pipeline (lead management)
    ├── Invoicing (invoice management)
    ├── Contacts (clients/providers/employees)
    ├── Configuration (settings)
    └── Lazy-loaded components:
        ├── TasksBoard
        └── MeetingsCalendar
```

---

## Development Workflows

### Git Workflow

**Branching Strategy**:
- `main` - Production-ready code
- `claude/*` - AI assistant feature branches (e.g., `claude/feature-name-xyz`)
- Feature branches follow naming: `claude/<description>-<session-id>`

**Commit Guidelines**:
- Use clear, descriptive commit messages
- Format: `<type>: <description>` (e.g., `feat: add dark mode toggle`)
- Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`
- Write messages in imperative mood ("add" not "added")

**Recent Commits** (for context):
```
7bc0345 Merge pull request #40 - Fix multi-user data sync
e22dbe0 Fix multi-user data sync - remove ownerId filter
78c0024 Enable Multi-User Collaboration
076e3ca Fix Financial Logic & UX
```

**Git Commands**:
```bash
# Always use the designated feature branch
git checkout claude/<branch-name>

# Commit changes
git add .
git commit -m "feat: add feature description"

# Push to remote (use -u for first push)
git push -u origin claude/<branch-name>
```

### Pull Request Guidelines

When creating PRs:
1. Review all changes in the diff
2. Ensure all tests pass (if applicable)
3. Write clear PR description with:
   - Summary of changes
   - Test plan/checklist
4. Use `gh pr create` command if available

### Environment Setup

**Required Environment Variables** (`.env`):
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Setup Steps**:
1. Clone repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in Firebase credentials
4. Run `npm run dev`
5. Access at `http://localhost:5173`

---

## Code Conventions

### JavaScript/React Conventions

**File Naming**:
- Components: `PascalCase.jsx` (e.g., `BookspaceLogo.jsx`)
- Hooks: `camelCase.js` starting with `use` (e.g., `useAuth.js`)
- Utils: `camelCase.js` (e.g., `formatters.js`)
- Constants: `camelCase.js` or `index.js`

**Component Structure**:
```javascript
// 1. Imports
import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from 'lucide-react';

// 2. Component definition
const ComponentName = ({ prop1, prop2 }) => {
  // 3. State
  const [state, setState] = useState(initialValue);

  // 4. Hooks
  const memoizedValue = useMemo(() => calculation(), [deps]);
  const callback = useCallback(() => {}, [deps]);

  // 5. Event handlers
  const handleClick = () => {};

  // 6. Render
  return (
    <div>...</div>
  );
};

// 7. Memoization (for reusable components)
export default React.memo(ComponentName);
```

**State Management**:
- Use `useState` for local component state
- Use `useRef` for non-reactive values (DOM refs, timers)
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Use custom hooks for shared logic (e.g., `useAuth`, `useCloudSync`)

**Naming Conventions**:
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (exported) or `camelCase` (local)
- Functions: `camelCase`
- Components: `PascalCase`
- Event handlers: `handleEventName` (e.g., `handleClick`, `handleSubmit`)
- Boolean variables: `is*`, `has*`, `should*` (e.g., `isLoading`, `hasError`)

### Styling Conventions

**Tailwind CSS**:
- Use utility classes directly in JSX
- Common patterns:
  - Containers: `bg-white rounded-2xl shadow-sm border border-gray-200 p-6`
  - Buttons: `px-4 py-2 bg-[#4f67eb] text-white rounded-lg hover:bg-[#2a1d89]`
  - Cards: `bg-gradient-to-br from-emerald-500 to-emerald-600 text-white`
  - Input fields: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500`

**Color Palette**:
```javascript
{
  primary: '#4f67eb',      // Bookspace blue
  secondary: '#2a1d89',    // Dark blue
  success: 'emerald-500/600',
  danger: 'red-500/600',
  warning: 'amber-500/600',
  neutral: '#b7bac3',      // Gray
  background: '#f8f9fc'    // Light gray
}
```

### Import Organization

```javascript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Icon1, Icon2 } from 'lucide-react';

// 3. Firebase
import { auth, firestore } from '../firebase/config';

// 4. Custom hooks
import { useAuth, usePagination } from '../hooks';

// 5. Components
import { StatCard, LoadingSpinner } from '../components/common';

// 6. Utils
import { formatCurrency, validateLead } from '../utils';

// 7. Constants
import { PLANES, EST_LEAD } from '../constants';

// 8. Styles (if separate CSS file)
import './styles.css';
```

### JSDoc Documentation

Use JSDoc for utility functions and complex logic:

```javascript
/**
 * Validates a lead object for required fields and formats
 * @param {Object} lead - The lead object to validate
 * @param {string} lead.contacto - Contact name
 * @param {string} lead.email - Email address
 * @param {string} lead.tel - Phone number
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export const validateLead = (lead) => {
  // Implementation
};
```

---

## Firebase & Cloud Sync

### Firestore Collections

**Collection Structure**:
```
firestore/
├── profiles/{userId}                  # User profiles (public read)
├── user_configs/{userId}              # User settings (private)
├── users_data/{userId}                # Legacy user data
│
├── Shared Collections (Multi-user):
│   ├── transactions/{docId}
│   ├── clients/{docId}
│   ├── providers/{docId}
│   ├── employees/{docId}
│   ├── leads/{docId}
│   ├── invoices/{docId}
│   └── meetings/{docId}
│
├── tasks/{taskId}                     # Shared tasks
│   ├── createdBy: userId
│   └── sharedWith: [userIds]
│
└── activity_log/{userId}/entries/{entryId}
```

**Security Model**:
- **Profiles**: Any authenticated user can read; owner can write
- **User configs**: Owner-only access
- **Shared collections**: Any authenticated user can read/write (enables collaboration)
- **Tasks**: Creator or users in `sharedWith` can access
- **Activity logs**: Owner-only access

### Sync Architecture

**Sync Flow**:
```
Local Action
    ↓
Update Local State (React)
    ↓
Debounced Save (1-2s delay)
    ↓
Save to IndexedDB/localStorage
    ↓
Save to Firestore (if authenticated)
    ↓
Real-time Listener Triggers
    ↓
Merge Remote Changes (by timestamp)
    ↓
Update UI
```

**Merge Strategy**:
- All entities MUST have `updatedAt` timestamp (milliseconds, `Date.now()`)
- During merge, newer version (by `updatedAt`) wins
- Supports multiple timestamp formats: Date, Firestore Timestamp, ISO string, Unix timestamp
- See `docs/data-model.md` for full data contract

**Sync Status States**:
```javascript
SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
  OFFLINE: 'offline'
}
```

### Storage Architecture

**Dual-Layer Storage**:
1. **Primary: IndexedDB**
   - Database: `bookspace-db`
   - Store: `kv`
   - Better performance, no size limits

2. **Fallback: localStorage**
   - Used if IndexedDB fails
   - Size limited (~5-10MB)

**Storage Keys** (`src/constants/index.js`):
```javascript
STORAGE_KEYS = {
  TRANSACTIONS: 'bs12-tx',
  CLIENTS: 'bs12-cli',
  PROVIDERS: 'bs12-prov',
  EMPLOYEES: 'bs12-emp',
  LEADS: 'bs12-leads',
  INVOICES: 'bs12-fact',
  MEETINGS: 'bs12-juntas',
  CONFIG: 'bs12-cfg',
  ACTIVITY_LOG: 'bs12-activity-log'
}
```

### Key Hooks

**useAuth** (`src/hooks/useAuth.js`):
```javascript
const { user, loading, login, register, logout, resetPassword } = useAuth();
```

**useCloudSync** (`src/hooks/useCloudSync.js`):
```javascript
const { syncStatus, lastSyncTime } = useCloudSync(
  userId,
  localData,
  onDataUpdate
);
```

---

## Data Models

### Core Entities

All entities must include:
- `id`: Unique identifier (typically timestamp or UUID)
- `updatedAt`: Timestamp in milliseconds (required for sync)

#### Transaction
```javascript
{
  id: number,                // Timestamp or unique ID
  fecha: string,             // ISO date string (YYYY-MM-DD)
  tipo: 'Ingreso' | 'Egreso',
  cat: string,               // Category (from CAT_ING or CAT_EGR)
  caja: 'Efectivo' | 'Banco' | 'Por cobrar' | 'Por pagar',
  monto: number,             // Amount (positive number)
  desc: string,              // Description
  updatedAt: number          // Timestamp (Date.now())
}
```

#### Lead (CRM)
```javascript
{
  id: number,
  contacto: string,          // Contact name
  venue: string,             // Venue name (optional)
  email: string,             // Email address
  tel: string,               // Phone number (10+ digits)
  estado: 'nuevo' | 'contactado' | 'interesado' | 'negociacion' | 'cerrado' | 'perdido',
  plan: string,              // Plan ID (from PLANES)
  fuente: string,            // Marketing source (from FUENTES)
  notas: string,             // Notes
  updatedAt: number
}
```

#### Invoice
```javascript
{
  id: number,
  numero: string,            // Invoice number
  fecha: string,             // ISO date
  clienteNom: string,        // Client name
  items: Array<{             // Invoice items
    d: string,               // Description
    c: number,               // Quantity
    p: number                // Unit price
  }>,
  estado: 'borrador' | 'pendiente' | 'pagada' | 'cancelada',
  sub: number,               // Subtotal
  iva: number,               // Tax amount (16%)
  total: number,             // Total with tax
  updatedAt: number
}
```

#### Client
```javascript
{
  id: number,
  nombre: string,
  email: string,
  rfc: string,               // Mexican tax ID (12-13 chars)
  tel: string,
  dir: string,               // Address
  updatedAt: number
}
```

#### Provider
```javascript
{
  id: number,
  nombre: string,
  email: string,
  rfc: string,
  tel: string,
  banco: string,             // Bank name
  cuenta: string,            // Account number
  updatedAt: number
}
```

#### Employee
```javascript
{
  id: number,
  nombre: string,
  puesto: string,            // Position
  salario: number,
  email: string,
  tel: string,
  updatedAt: number
}
```

#### Meeting
```javascript
{
  id: number,
  leadId: number,            // Associated lead
  leadNom: string,           // Lead name
  fecha: string,             // ISO date
  hora: string,              // Time (HH:MM)
  tipo: string,              // Meeting type
  notas: string,
  updatedAt: number
}
```

#### Task
```javascript
{
  id: string,
  createdBy: string,         // User ID
  sharedWith: string[],      // Array of user IDs
  title: string,
  description: string,
  status: string,
  dueDate: string,           // ISO date
  createdAt: number,
  updatedAt: number
}
```

### Constants Reference

See `src/constants/index.js` for complete definitions:

- `CAT_ING`: Income categories
- `CAT_EGR`: Expense categories
- `CAJAS`: Cash account types
- `TIPOS_VENUE`: Venue types
- `PLANES`: Subscription plans with pricing
- `EST_LEAD`: Lead pipeline states with colors
- `EST_FACT`: Invoice states with colors
- `FUENTES`: Marketing sources
- `MESES`: Month abbreviations (Spanish)
- `MESES_COMPLETOS`: Full month names (Spanish)

---

## Key Patterns & Best Practices

### 1. Validation Before Save

**Always validate data before saving**:

```javascript
import { validateLead } from './utils/validators';

const saveLead = () => {
  const { isValid, errors } = validateLead(leadData);

  if (!isValid) {
    errors.forEach(error => notify(error, 'error'));
    return;
  }

  // Proceed with save
};
```

### 2. Error Handling

**Use centralized error handling**:

```javascript
import { handleError, withErrorHandling } from './utils/errorHandling';

// Option 1: Try-catch
const loadData = async () => {
  try {
    const data = await fetchData();
    setData(data);
  } catch (error) {
    handleError(error, 'loadData', notify);
  }
};

// Option 2: Wrapper
const safeLoadData = withErrorHandling(
  async () => {
    const data = await fetchData();
    setData(data);
  },
  'loadData',
  notify
);
```

### 3. Component Optimization

**Use React.memo for reusable components**:

```javascript
import React from 'react';

const StatCard = ({ title, value, icon: Icon }) => {
  return (
    <div className="stat-card">
      <Icon />
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
};

export default React.memo(StatCard);
```

**Use useMemo for expensive calculations**:

```javascript
const totalIncome = useMemo(() => {
  return transactions
    .filter(t => t.tipo === 'Ingreso')
    .reduce((sum, t) => sum + t.monto, 0);
}, [transactions]);
```

**Use useCallback for event handlers**:

```javascript
const handleDelete = useCallback((id) => {
  setTransactions(prev => prev.filter(t => t.id !== id));
}, []);
```

### 4. Pagination for Large Lists

**Always paginate lists with >20 items**:

```javascript
import { usePagination } from './hooks';
import { Pagination } from './components/common';

const TransactionList = ({ transactions }) => {
  const {
    paginatedData,
    currentPage,
    totalPages,
    goToPage,
    itemsPerPage,
    totalItems
  } = usePagination(transactions, 20);

  return (
    <>
      {paginatedData.map(tx => (
        <TransactionRow key={tx.id} {...tx} />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
      />
    </>
  );
};
```

### 5. Debouncing Saves

**Debounce frequent save operations**:

```javascript
// useStorage hook already implements debouncing
const { updateTransactions } = useStorage(notify);

// This will be debounced (1s delay)
updateTransactions(newTransactions);
```

### 6. Formatting Display Values

**Always format data for display**:

```javascript
import { formatCurrency, formatDate, formatPhone } from './utils/formatters';

// Currency
const displayPrice = formatCurrency(2499); // "$2,499.00"

// Date
const displayDate = formatDate("2025-01-18"); // "18/01/2025"

// Phone
const displayPhone = formatPhone("5512345678"); // "(55) 1234-5678"
```

### 7. Empty States

**Show meaningful empty states**:

```javascript
import { EmptyState } from './components/common';
import { Users, Plus } from 'lucide-react';

{clients.length === 0 ? (
  <EmptyState
    icon={Users}
    title="No hay clientes aún"
    description="Los clientes aparecerán aquí cuando los agregues"
    action={
      <button onClick={addClient}>
        <Plus /> Agregar primer cliente
      </button>
    }
  />
) : (
  <ClientList clients={clients} />
)}
```

### 8. Loading States

**Show loading indicators during async operations**:

```javascript
import { LoadingSpinner } from './components/common';

if (loading) {
  return <LoadingSpinner text="Cargando datos..." />;
}
```

### 9. Consistent Notifications

**Use notification system for user feedback**:

```javascript
// Success
notify('Guardado correctamente', 'success');

// Error
notify('Error al guardar', 'error');

// Warning
notify('Algunos campos están vacíos', 'warning');

// Info
notify('Sincronización completada', 'info');
```

### 10. Calculations Separation

**Keep business logic separate from UI**:

```javascript
import {
  calculateTotals,
  calculateCRMStats,
  calculateMetrics
} from './utils/calculations';

// In component
const totals = useMemo(
  () => calculateTotals(transactions),
  [transactions]
);
```

---

## Testing & Quality

### Current State
- **No automated tests currently implemented**
- Manual testing via development environment

### Recommended Testing Strategy

**Unit Tests** (recommended: Jest + React Testing Library):
```javascript
// Example test structure
describe('validateLead', () => {
  it('should validate required fields', () => {
    const result = validateLead({ contacto: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('El nombre del contacto es requerido');
  });
});
```

**Integration Tests** (recommended: Firebase Emulator):
```bash
# Run Firebase emulators for testing
firebase emulators:start
```

**E2E Tests** (recommended: Cypress or Playwright):
```javascript
// Example Cypress test
describe('Transaction Flow', () => {
  it('should create a new transaction', () => {
    cy.visit('/');
    cy.get('[data-testid="add-transaction"]').click();
    // ... test steps
  });
});
```

### Code Quality Checklist

Before committing changes, verify:
- [ ] All imports are used
- [ ] No console.log statements (except intentional logging)
- [ ] Error handling implemented for async operations
- [ ] Data validated before saving
- [ ] Components optimized (React.memo where appropriate)
- [ ] Large lists use pagination
- [ ] User feedback provided (notifications, loading states)
- [ ] Code follows naming conventions
- [ ] JSDoc comments for utility functions

---

## Common Tasks

### Adding a New Feature

1. **Understand existing patterns**:
   - Review similar features
   - Check constants for reusable values
   - Identify which utilities/hooks to use

2. **Create components**:
   ```javascript
   // src/components/feature/FeatureComponent.jsx
   import React from 'react';

   const FeatureComponent = () => {
     // Implementation
   };

   export default React.memo(FeatureComponent);
   ```

3. **Add validation** (if handling user input):
   ```javascript
   // src/utils/validators.js
   export const validateFeature = (data) => {
     const errors = [];
     // Validation logic
     return { isValid: errors.length === 0, errors };
   };
   ```

4. **Add calculations** (if needed):
   ```javascript
   // src/utils/calculations.js
   export const calculateFeatureMetrics = (data) => {
     // Calculation logic
   };
   ```

5. **Update constants** (if needed):
   ```javascript
   // src/constants/index.js
   export const FEATURE_OPTIONS = [...];
   ```

6. **Test thoroughly**:
   - Manual testing in dev environment
   - Test offline/online scenarios (if sync involved)
   - Verify mobile responsiveness

### Modifying Existing Data Models

**Important**: Changing data models requires careful migration:

1. **Update the model definition** in this document
2. **Update validation** in `src/utils/validators.js`
3. **Update calculations** that use the model
4. **Add migration logic** in `useCloudSync` or `useStorage`
5. **Update Firestore security rules** if needed
6. **Test with existing data** to ensure backward compatibility

Example migration:
```javascript
// In useCloudSync or data loading
const migrateData = (data) => {
  return data.map(item => ({
    ...item,
    newField: item.newField || defaultValue, // Add new field
    updatedAt: item.updatedAt || Date.now() // Ensure required fields
  }));
};
```

### Adding New UI Components

1. **Create component file**:
   ```javascript
   // src/components/common/NewComponent.jsx
   import React from 'react';

   const NewComponent = ({ prop1, prop2 }) => {
     return <div>{/* JSX */}</div>;
   };

   export default React.memo(NewComponent);
   ```

2. **Export from index**:
   ```javascript
   // src/components/common/index.js
   export { default as NewComponent } from './NewComponent';
   ```

3. **Use in parent**:
   ```javascript
   import { NewComponent } from './components/common';

   <NewComponent prop1={value1} prop2={value2} />
   ```

### Debugging Cloud Sync Issues

1. **Check sync status**:
   ```javascript
   // SyncIndicator shows current status
   // Check browser console for errors
   ```

2. **Verify Firebase config**:
   ```javascript
   // Ensure .env has all required variables
   // Check Firebase console for auth/database issues
   ```

3. **Check timestamps**:
   ```javascript
   // All entities must have updatedAt
   console.log(data.map(d => ({ id: d.id, updatedAt: d.updatedAt })));
   ```

4. **Review Firestore rules**:
   ```bash
   # Check firestore.rules for permission issues
   # Verify user authentication state
   ```

### Exporting Data

```javascript
import { exportToCSV, exportToJSON, downloadFile } from './utils/export';

// CSV Export
const csvBlob = exportToCSV(
  transactions,
  ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Descripción'],
  (t) => [t.fecha, t.tipo, t.cat, t.monto, t.desc]
);
downloadFile(csvBlob, 'transacciones.csv');

// JSON Export
const jsonBlob = exportToJSON(
  transactions,
  'Transacciones',
  ['id', 'fecha', 'tipo', 'cat', 'monto', 'desc'],
  (t) => ({ ...t }),
  { year: 2025, month: 'Enero' }
);
downloadFile(jsonBlob, 'transacciones.json');
```

---

## Troubleshooting

### Common Issues

#### 1. StorageError

**Symptoms**: Error when loading/saving data

**Causes**:
- IndexedDB not available
- Storage quota exceeded
- Serialization errors

**Solutions**:
```javascript
// Check if storage is available
if (!window.storage) {
  console.error('Storage not initialized');
}

// Check storage quota (Chrome DevTools → Application → Storage)
// Clear old data if needed
localStorage.clear(); // Caution: deletes all local data
```

#### 2. ValidationError

**Symptoms**: Data not saving, error notifications

**Causes**:
- Missing required fields
- Invalid formats (email, RFC, phone)
- Type mismatches

**Solutions**:
```javascript
// Always validate before save
const { isValid, errors } = validateEntity(data);
if (!isValid) {
  console.log('Validation errors:', errors);
  // Fix data based on error messages
}
```

#### 3. Firebase Permission Denied

**Symptoms**: "Permission denied" in console

**Causes**:
- User not authenticated
- Firestore rules blocking access
- Accessing wrong collection path

**Solutions**:
```javascript
// Check authentication
if (!auth.currentUser) {
  console.log('User not authenticated');
}

// Verify Firestore rules in Firebase Console
// Check collection paths match security rules
```

#### 4. Sync Not Working

**Symptoms**: Changes not syncing across devices

**Causes**:
- No internet connection
- Firebase not configured
- Missing `updatedAt` timestamps

**Solutions**:
```javascript
// Check online status
console.log('Online:', navigator.onLine);

// Verify Firebase config
console.log('Firebase configured:', !!auth.currentUser);

// Ensure all entities have updatedAt
const missingTimestamp = data.filter(d => !d.updatedAt);
console.log('Missing updatedAt:', missingTimestamp);
```

#### 5. Performance Issues

**Symptoms**: Slow rendering, laggy UI

**Causes**:
- Large lists not paginated
- Components not memoized
- Expensive calculations in render

**Solutions**:
```javascript
// Use pagination for lists >20 items
const { paginatedData } = usePagination(largeList, 20);

// Memoize components
export default React.memo(Component);

// Memoize calculations
const result = useMemo(() => expensiveCalc(), [deps]);

// Use callback for handlers
const handler = useCallback(() => {}, [deps]);
```

#### 6. Build Errors

**Symptoms**: `npm run build` fails

**Common causes**:
- Unused imports
- Missing dependencies
- Syntax errors

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for errors
npm run build

# Review error messages carefully
```

### Debug Mode

Enable detailed logging:

```javascript
// In component
const DEBUG = true;

if (DEBUG) {
  console.log('State:', state);
  console.log('Props:', props);
  console.log('Calculated:', calculatedValue);
}
```

### Browser DevTools

**Useful panels**:
- **Console**: Check for errors, warnings
- **Network**: Monitor Firebase requests
- **Application**:
  - Check IndexedDB (`bookspace-db`)
  - Check localStorage keys
  - View cookies/session
- **Performance**: Profile slow operations
- **React DevTools**: Inspect component tree, props, state

---

## Additional Resources

### Documentation Files

- **README.md**: Project overview and features
- **FIREBASE_SETUP.md**: Complete Firebase setup guide
- **GUIA_RAPIDA.md**: Quick start guide (Spanish)
- **MEJORAS_FASE_1.md**: Phase 1 improvements documentation
- **docs/data-model.md**: Data model and sync contract
- **DEPENDENCY_AUDIT.md**: Dependency analysis

### External Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Lucide Icons](https://lucide.dev)

### Key Files for Reference

- **Utils**: `src/utils/` - All utility functions
- **Hooks**: `src/hooks/` - Custom React hooks
- **Components**: `src/components/common/` - Reusable UI components
- **Constants**: `src/constants/index.js` - All app constants
- **Firebase**: `src/firebase/` - Firebase integration
- **Main App**: `src/BookspaceERP.jsx` - Main application logic

---

## AI Assistant Guidelines

### When Working on This Codebase

1. **Always read relevant documentation first**:
   - Check this CLAUDE.md file
   - Review MEJORAS_FASE_1.md for context
   - Check data-model.md for data contracts

2. **Follow existing patterns**:
   - Don't reinvent the wheel
   - Use existing utilities, hooks, and components
   - Maintain consistency with current code style

3. **Validate all changes**:
   - Use existing validators
   - Add new validators for new data types
   - Always validate before saving

4. **Handle errors properly**:
   - Use centralized error handling
   - Provide user feedback
   - Log errors for debugging

5. **Optimize for performance**:
   - Use React.memo for components
   - Use useMemo for calculations
   - Use useCallback for handlers
   - Implement pagination for large lists

6. **Test thoroughly**:
   - Manual testing required (no automated tests yet)
   - Test both online and offline scenarios
   - Verify mobile responsiveness
   - Check cross-browser compatibility

7. **Document your changes**:
   - Update this file if architecture changes
   - Add JSDoc comments for new utilities
   - Write clear commit messages
   - Update README.md if user-facing features change

8. **Git workflow**:
   - Work on designated feature branch (`claude/*`)
   - Commit frequently with clear messages
   - Push when ready for review
   - Create detailed pull requests

### What to Avoid

- ❌ Don't create duplicate utilities (check `src/utils/` first)
- ❌ Don't skip validation on user input
- ❌ Don't forget error handling on async operations
- ❌ Don't render large lists without pagination
- ❌ Don't modify data models without migration strategy
- ❌ Don't commit `.env` file (it's gitignored)
- ❌ Don't use `console.log` excessively (remove before commit)
- ❌ Don't ignore TypeScript migration path (Phase 2 goal)

### Questions to Ask Before Coding

1. Is there an existing utility/hook/component I can reuse?
2. Does this need validation? (Yes, probably)
3. Does this need error handling? (Yes, if async)
4. Will this list grow large? (Use pagination)
5. Is this component reusable? (Optimize with React.memo)
6. Does this change affect data models? (Plan migration)
7. Does this require Firebase security rule changes?
8. How will this work offline?

---

## Appendix

### Project Phases

**Phase 1** (Completed):
- ✅ Modularization of monolithic code
- ✅ Validation system
- ✅ Error handling
- ✅ Reusable components
- ✅ Custom hooks
- ✅ Cloud synchronization

**Phase 2** (Planned):
- [ ] TypeScript migration
- [ ] Global search functionality
- [ ] Kanban view for CRM
- [ ] Dark mode

**Phase 3** (Future):
- [ ] Keyboard shortcuts
- [ ] Advanced reporting with charts
- [ ] Reminders and notifications
- [ ] Interactive onboarding
- [ ] Performance optimizations

**Phase 4** (Vision):
- [ ] External integrations (Banks, Email)
- [ ] Multi-user with role-based access control
- [ ] ML predictions
- [ ] Native mobile app
- [ ] Public API

### Version History

- **v1.1.0** (January 2026): Cloud sync, multi-user collaboration
- **v1.0.0** (January 2026): Phase 1 modularization complete

---

**End of CLAUDE.md**

For questions or updates to this document, please update this file and commit with a clear message explaining what was changed and why.
