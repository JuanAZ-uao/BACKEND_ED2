# Concertix — Backend

API REST del proyecto Concertix, una plataforma de venta de boletas para conciertos. Hecho con Node.js, Express y PostgreSQL (Neon) como base de datos principal. También usa Firebase Realtime Database para las funciones en tiempo real.

---

## Stack

- **Node.js + Express** — servidor HTTP, arquitectura MVC
- **Prisma ORM** — modelos, migraciones y queries a PostgreSQL
- **PostgreSQL (Neon)** — base de datos serverless
- **Firebase Admin SDK** — tiempo real (timer del carrito, asientos en reserva, asientos vendidos)
- **JWT** — autenticación con access token (15 min) y refresh token (7 días)
- **bcryptjs** — hash de contraseñas

---

## Arquitectura

El backend sigue el patrón **MVC** (Model - View - Controller), adaptado a una API REST donde no hay vistas:

- **Model** — Prisma maneja el modelo de datos. Cada tabla del schema es un modelo con sus relaciones, tipos y restricciones.
- **Controller** — recibe la request HTTP, valida lo básico y delega al service. No tiene lógica de negocio.
- **Service** — acá vive toda la lógica: validaciones de negocio, cálculos, uso de estructuras de datos, llamadas a Firebase.

El flujo de una request siempre es el mismo:

```
Request → Router → Middleware (auth/roles) → Controller → Service → Prisma → DB
```

Los middlewares de autenticación y roles se ejecutan antes del controller, así los servicios ya pueden asumir que el usuario está verificado.

---

## Estructuras de datos

Implementadas manualmente en `src/data-structures/` y usadas directamente en los servicios:

| Estructura | Dónde se usa | Para qué |
|---|---|---|
| BST | `concert.service.js` | búsqueda de conciertos por prefijo (artista o tour) |
| Graph | `concert.service.js` | conciertos relacionados por género, venue o artista (BFS) |
| Stack | `cart.service.js` | historial de acciones del carrito por usuario |
| Queue | `ticket.service.js` | lista de espera cuando no hay disponibilidad |
| MinHeap | `order.service.js` | procesar líneas de la orden ordenadas por precio |

---

## Estructura del proyecto

```
src/
├── config/          # prisma client, firebase
├── controllers/     # reciben la request, llaman al service
├── services/        # lógica de negocio
├── routes/          # definición de rutas
├── middlewares/     # auth, roles, manejo de errores
├── data-structures/ # BST, Graph, Stack, Queue, MinHeap
└── utils/
prisma/
├── schema.prisma
├── seed.js
└── migrations/
```

---

## Endpoints principales

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/concerts
GET    /api/concerts/:id
GET    /api/concerts/search?q=
GET    /api/concerts/:id/related

GET    /api/tickets/concert/:concertId
POST   /api/tickets/reserve
DELETE /api/tickets/:id

GET    /api/cart
POST   /api/cart/items
DELETE /api/cart/items/:ticketTypeId
DELETE /api/cart
GET    /api/cart/history

GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
DELETE /api/orders/:id

GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/me/tickets
GET    /api/users/me/payment-methods
POST   /api/users/me/payment-methods
DELETE /api/users/me/payment-methods/:id
```

---

## Cómo correrlo

1. Clonar el repo e instalar dependencias:
```bash
npm install
```

2. Crear el archivo `.env` con:
```
DATABASE_URL="postgresql://..."
JWT_SECRET="tu_secreto"
JWT_REFRESH_SECRET="tu_secreto_refresh"
FIREBASE_DATABASE_URL="https://tu-proyecto.firebaseio.com"
```

3. Colocar el archivo de credenciales de Firebase en `prisma/firebase-admin-key.json`

4. Aplicar el schema y cargar datos de prueba:
```bash
npx prisma db push
npm run seed
```

5. Levantar el servidor:
```bash
npm run dev
```



---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | conexión a PostgreSQL (Neon) |
| `JWT_SECRET` | secreto para access tokens |
| `JWT_REFRESH_SECRET` | secreto para refresh tokens |
| `FIREBASE_DATABASE_URL` | URL de la Realtime Database de Firebase |
