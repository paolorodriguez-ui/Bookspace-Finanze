# Configuracion de Firebase para Sincronizacion

Esta guia te ayudara a configurar Firebase para habilitar la sincronizacion de datos entre diferentes dispositivos.

## Paso 1: Crear un Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto" o "Add project"
3. Ingresa un nombre para tu proyecto (ej: "bookspace-finanze")
4. Puedes deshabilitar Google Analytics si no lo necesitas
5. Haz clic en "Crear proyecto"

## Paso 2: Agregar una Aplicacion Web

1. En la pagina principal de tu proyecto, haz clic en el icono de web (</>)
2. Registra tu app con un nombre (ej: "Bookspace Web")
3. **Copia las credenciales** que te mostrara Firebase

## Paso 3: Habilitar Autenticacion

1. En el menu lateral, ve a "Authentication"
2. Haz clic en "Comenzar" o "Get started"
3. En la pestana "Sign-in method", habilita "Email/Password"
4. Guarda los cambios

## Paso 4: Crear la Base de Datos Firestore

1. En el menu lateral, ve a "Firestore Database"
2. Haz clic en "Crear base de datos" o "Create database"
3. Selecciona "Comenzar en modo de produccion"
4. Elige una ubicacion cercana a ti (ej: nam5 para America)
5. Haz clic en "Habilitar"
6. Los datos se guardan en `/users/{uid}` y en subcolecciones dentro de cada usuario (por ejemplo: `transactions`, `clients`, `providers`, etc.).

## Paso 5: Configurar Reglas de Seguridad

1. En Firestore, ve a la pestana "Reglas"
2. Reemplaza las reglas con las siguientes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Los usuarios solo pueden leer/escribir sus propios datos
    match /users_data/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Perfiles públicos de usuarios
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Subcolecciones de datos por usuario (transactions/clients/providers/etc.)
    match /users/{userId}/{subcollection}/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Tareas por usuario: el owner o miembros en sharedWith pueden leer/escribir
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null
        && (request.auth.uid == userId
        || request.auth.uid in resource.data.sharedWith
        || request.auth.uid in request.resource.data.sharedWith);
    }

    // Tareas compartidas por workspace (opcional)
    match /workspaces/{workspaceId}/tasks/{taskId} {
      allow read, write: if request.auth != null
        && (request.auth.uid in resource.data.sharedWith
        || request.auth.uid in request.resource.data.sharedWith);
    }
  }
}
```

3. Haz clic en "Publicar"

> Nota: `users_data` es un esquema legado y solo se usa para procesos de migración.

## Paso 6: Configurar Variables de Entorno

1. Crea un archivo `.env` en la raiz de tu proyecto
2. Agrega las credenciales que copiaste en el Paso 2:

```env
VITE_FIREBASE_API_KEY=tu-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

## Paso 7: Reiniciar la Aplicacion

1. Detén el servidor de desarrollo si está corriendo
2. Ejecuta `npm run dev` nuevamente
3. La sincronización debería estar habilitada ahora

## Como Usar

1. **Crear cuenta**: Haz clic en tu avatar en la esquina superior derecha y selecciona "Iniciar sesión"
2. **Registrarse**: Si no tienes cuenta, haz clic en "Regístrate"
3. **Sincronización automática**: Una vez logueado, tus datos se sincronizarán automáticamente
4. **Acceder desde otro dispositivo**: Inicia sesión con la misma cuenta y tus datos aparecerán

## Solución de Problemas

### Error: "Firebase no configurado"
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto

### Error: "Permission denied"
- Verifica que las reglas de Firestore estén correctamente configuradas
- Asegúrate de estar autenticado

### Los datos no se sincronizan
- Verifica tu conexión a internet
- Revisa la consola del navegador para errores
- Intenta cerrar sesión y volver a iniciar

## Plan Gratuito de Firebase

El plan gratuito de Firebase (Spark) incluye:
- 50,000 lecturas por día
- 20,000 escrituras por día
- 1 GB de almacenamiento

Esto es más que suficiente para uso personal y pequeños negocios.
