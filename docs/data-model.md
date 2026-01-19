# 📘 Contrato de datos (Bookspace Finanze)

Este documento describe el contrato mínimo que deben cumplir las entidades para mantener la sincronización y los merges consistentes entre local y nube.

## Campo `updatedAt` (obligatorio)

Todas las entidades de datos **deben** incluir el campo `updatedAt`:

- **Tipo**: `number` (timestamp en milisegundos, `Date.now()`).
- **Uso**: determinar cuál versión de un registro es más reciente durante la sincronización.
- **Regla**: cada vez que un registro se crea o se actualiza, se debe asignar un nuevo `updatedAt`.

## Entidades cubiertas

El campo `updatedAt` aplica (como mínimo) a:

- Transacciones (`transactions`)
- Clientes (`clients`)
- Proveedores (`providers`)
- Empleados (`employees`)
- Leads (`leads`)
- Facturas (`invoices`)
- Juntas / reuniones (`meetings`)

## Ejemplo recomendado

```json
{
  "id": 1719947000000,
  "nombre": "Cliente Ejemplo",
  "email": "cliente@ejemplo.com",
  "updatedAt": 1719947123456
}
```

## Notas de sincronización

La lógica de sincronización compara `updatedAt` (normalizado a número) para resolver conflictos. Si un registro no tiene `updatedAt`, la sincronización usará la fecha (`fecha`) como fallback, pero **no es el comportamiento recomendado**.
