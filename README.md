# Blog API

REST API for a personal blog, built as part of [The Odin Project](https://www.theodinproject.com/lessons/node-path-nodejs-blog-api) Node.js curriculum.

The API is the backend for two separate front-ends:

- **blog-client**: the public site, where visitors read posts and leave comments
- **blog-admin**: the author's dashboard, to write, edit and publish posts and moderate comments

The server only speaks JSON. Authentication uses **JSON Web Tokens** sent in the `Authorization` header.

> 🚧 Work in progress. See [Roadmap](#roadmap) for what is done and what is coming.

---

## Features

- Public read access to published posts
- Draft / published workflow (a post is published when `publishedAt` is set)
- JWT login, with role-based access (`USER` / `ADMIN`)
- Comments from anonymous visitors (name required) or logged-in readers
- Centralized error handling with consistent JSON errors and proper HTTP status codes

## Tech stack

- **Node.js** (≥ 22.18) + **Express 5**, ES modules
- **PostgreSQL** + **Prisma 7** (with `@prisma/adapter-pg`)
- **jsonwebtoken** for auth, **bcryptjs** for password hashing
- **express-validator** for input validation
- **cors**, **dotenv**, **nodemon**

---

## Getting started

### Prerequisites

- Node.js **22.18 or later** (the generated Prisma client is TypeScript, which recent Node versions run natively)
- A PostgreSQL database

### Installation

```bash
git clone git@github.com:Aurel-Charles/Project-Blog-API-SERVER-TOP.git
cd Project-Blog-API-SERVER-TOP
npm install
```

### Environment variables

Create a `.env` file at the root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/blog_api"
JWT_SECRET="a-long-random-string"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="choose-a-strong-password"
PORT=3000
```

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Database

```bash
npx prisma migrate dev     # create the tables
npx prisma generate        # generate the Prisma client in generated/prisma
npm run seed               # create the admin account and sample data
```

⚠️ The seed script deletes all existing posts (and their comments) before inserting sample data. Only use it in development.

The seed creates:

- the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- a test reader: `lecteur@test.fr` / `lecteur123`
- 4 posts (3 published, 1 draft) and 2 comments

### Run

```bash
npm run dev
```

The API runs on `http://localhost:3000`.

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the server with nodemon |
| `npm run seed` | Seed the database (development only) |

---

## API

### Authentication

Log in to get a token:

```http
POST /auth/login
Content-Type: application/json

{ "email": "admin@example.com", "password": "..." }
```

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

Then send it with every protected request:

```http
Authorization: Bearer <token>
```

Tokens expire after 1 day. To log out, the client simply deletes its token.

### Endpoints

✅ implemented · 🚧 planned

#### Auth

| Method | Route | Access | Status |
|---|---|---|---|
| `POST` | `/auth/login` | Public | ✅ |
| `POST` | `/auth/register` | Public | 🚧 |

#### Posts

| Method | Route | Access | Status |
|---|---|---|---|
| `GET` | `/posts` | Public (published posts only) | ✅ |
| `GET` | `/posts/:postId` | Public (published posts only) | ✅ |
| `POST` | `/posts` | Admin | 🚧 |
| `PATCH` | `/posts/:postId` | Admin (edit, publish / unpublish) | 🚧 |
| `DELETE` | `/posts/:postId` | Admin | 🚧 |

#### Comments

| Method | Route | Access | Status |
|---|---|---|---|
| `GET` | `/posts/:postId/comments` | Public | 🚧 |
| `POST` | `/posts/:postId/comments` | Public (name required if not logged in) | 🚧 |
| `PATCH` | `/posts/:postId/comments/:commentId` | Admin or comment author | 🚧 |
| `DELETE` | `/posts/:postId/comments/:commentId` | Admin or comment author | 🚧 |

### Example: list posts

```http
GET /posts
```

```json
[
  {
    "id": 3,
    "title": "Hugo ou Express ?",
    "content": "...",
    "createdAt": "2026-10-13T08:00:00.000Z",
    "updatedAt": "2026-10-15T08:00:00.000Z",
    "publishedAt": "2026-10-14T08:00:00.000Z",
    "authorId": 1,
    "author": { "firstname": "Aurel", "lastname": "Charles" }
  }
]
```

Posts are sorted by `publishedAt`, most recent first. The author's password and email are never returned.

### Errors

All errors share the same shape:

```json
{ "error": "Invalid or expired token" }
```

| Status | Meaning |
|---|---|
| `400` | Invalid input |
| `401` | Not logged in, invalid or expired token, wrong credentials |
| `403` | Logged in, but not allowed (e.g. not an admin) |
| `404` | Resource not found |
| `409` | Conflict (e.g. email already used) |
| `500` | Server error |

---

## Data model

- **User**: `firstname`, `lastname`, `email` (unique), hashed `password`, `role` (`USER` by default, `ADMIN`)
- **Post**: `title`, `content`, `publishedAt` (`null` = draft), belongs to a User
- **Comment**: `content`, `name`, belongs to a Post, optionally linked to a User

Deleting a post deletes its comments. Deleting a user keeps their comments (the `name` remains).

The full schema is in [`prisma/schema.prisma`](prisma/schema.prisma).

## Project structure

```
src/
├── app.js              # Express app, routers, error handler
├── routes/             # URL → middlewares → controller
├── controllers/        # Read the request, call queries, send JSON
├── db/
│   ├── prisma.js       # Prisma client instance
│   └── queries.js      # All database access
├── middlewares/
│   └── auth.js         # isAuth, isAdmin
└── utils/
    ├── httpErrorHandler.js   # HttpError class
    └── verifyPassword.js     # bcrypt helpers
prisma/
├── schema.prisma
├── migrations/
└── seed.js
```

A request flows through: **route → middlewares → controller → queries → JSON response**.

---

## Roadmap

- [x] Database schema, migrations and seed
- [x] Centralized error handling
- [x] Public routes to read published posts
- [x] JWT login, `isAuth` and `isAdmin` middlewares
- [ ] Create, edit, publish and delete posts (admin)
- [ ] Admin can see drafts through the public routes
- [ ] Comments routes, with author / admin permissions
- [ ] Input validation with express-validator
- [ ] Reader registration
- [ ] Deployment

## Related repositories

- `blog-client`: public reader site (coming soon)
- `blog-admin`: author dashboard (coming soon)
