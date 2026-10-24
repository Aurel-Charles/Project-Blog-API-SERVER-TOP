# Blog API

A REST API for a personal blog, built with **Express 5**, **Prisma 7** and **PostgreSQL**, as part of the [Node.js path of The Odin Project](https://www.theodinproject.com/lessons/node-path-nodejs-blog-api).

One API, two front-ends:

- **blog-client**: the public site, where visitors read posts and leave comments
- **blog-admin**: the author's dashboard, to write, publish and moderate

The server only speaks JSON. Authentication is stateless, with **JSON Web Tokens** sent in the `Authorization` header.

---

## Features

- **Draft / published workflow**: a post is a draft until it is published. The publication date is set by the server, and kept if the post is re-published.
- **Role-based access**: one `ADMIN` (the author) and `USER` accounts for readers. The admin account is created by the seed script and can never be created through the API.
- **Secure by default**: post routes only return published posts, for everyone. The admin gets drafts too only when asking for them explicitly with `?status=all`, so a front-end that forgets the parameter can never leak a draft.
- **Open comments**: anonymous visitors comment with a name; logged-in readers get their name filled in by the server.
- **Comment moderation**: a comment can be edited or deleted by its author or by the admin.
- **Reader registration**: sign up and get logged in straight away.
- **Input validation** on every write route, with clear error messages.
- **HTML sanitizing**: post content is rich text (HTML written in the admin's editor). It is cleaned before being saved, so only a short list of safe tags can reach the database.
- **Consistent errors**: every error is JSON with the right HTTP status code, and internal errors never leak details to the client.

## Tech stack

| | |
|---|---|
| Runtime | Node.js ≥ 22.18, ES modules |
| Framework | Express 5 |
| Database | PostgreSQL, Prisma 7 (`@prisma/adapter-pg`) |
| Auth | jsonwebtoken, bcryptjs |
| Validation | express-validator, sanitize-html |
| Other | cors, dotenv, nodemon |

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

Copy the example file and fill it in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign tokens. Use a long random string. |
| `ADMIN_EMAIL` | Email of the admin account created by the seed |
| `ADMIN_PASSWORD` | Password of the admin account created by the seed |
| `CORS_ORIGINS` | **Required.** Origins allowed to call the API, separated by commas, with no spaces and no trailing slash (e.g. `http://localhost:5173,http://localhost:5174`). The server will not start without it. |
| `PORT` | Optional, defaults to `3000` |

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

> ⚠️ The seed script deletes all existing posts (and their comments) before inserting sample data. Development only.

The seed creates:

- the admin account, from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- a test reader: `lecteur@test.fr` / `lecteur123`
- 4 posts (3 published, 1 draft) and 2 comments

### Run

```bash
npm run dev
```

The API runs on `http://localhost:3000`.

| Script | Description |
|---|---|
| `npm run dev` | Start the server with nodemon |
| `npm run seed` | Seed the database (development only) |

---

## Authentication

`POST /auth/register` and `POST /auth/login` both return a token:

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

Send it with every request that needs a logged-in user:

```http
Authorization: Bearer <token>
```

- The token contains the user's `id` and `role` only, and expires after **1 day**.
- To log out, the client simply deletes its token.
- On public routes the token is optional: without it you are an anonymous visitor, with it you get the extra rights of your role.

---

## API reference

| Access | Meaning |
|---|---|
| Public | No token needed |
| Logged in | Any valid token |
| Admin | Token with the `ADMIN` role |

### Auth

| Method | Route | Access | Body |
|---|---|---|---|
| `POST` | `/auth/register` | Public | `firstname`, `lastname`, `email`, `password`, `confirmPassword` |
| `POST` | `/auth/login` | Public | `email`, `password` |
| `GET` | `/auth/me` | Logged in | — |
| `GET` | `/auth/me/comments` | Logged in | — |

**Register rules**: `firstname` and `lastname` are required (20 characters max), `email` must be valid and not already used (`409` otherwise), `password` needs at least 7 characters and `confirmPassword` must match it. New accounts always get the `USER` role.

```http
POST /auth/register
Content-Type: application/json

{
  "firstname": "Léa",
  "lastname": "Martin",
  "email": "lea@example.com",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

`201 Created`

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Current user**: `GET /auth/me` returns the account behind the token. The client can call it on page load to check that the stored token is still valid and to know who is logged in.

```http
GET /auth/me
Authorization: Bearer <token>
```

`200 OK`

```json
{ "id": 2, "firstname": "Léa", "lastname": "Martin", "email": "lea@example.com", "role": "USER" }
```

Returns `401` if the token is missing, invalid or expired, or if the account no longer exists. The password is never returned.

**My comments**: `GET /auth/me/comments` returns the comments written by the logged-in user, newest first, each with the `id` and `title` of its post. Comments on posts that are no longer published are left out, so every link leads to a readable post. An account without comments gets an empty array.

```json
[
  {
    "id": 7,
    "content": "Great article!",
    "name": "Léa M.",
    "createdAt": "2026-10-17T09:00:00.000Z",
    "updatedAt": "2026-10-17T09:00:00.000Z",
    "postId": 3,
    "authorId": 2,
    "post": { "id": 3, "title": "Hugo ou Express ?" }
  }
]
```

### Posts

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/posts` | Public | Published posts, newest first. With `?status=all`, the admin gets drafts too (newest created first). |
| `GET` | `/posts/:postId` | Public | One published post. A draft returns `404`, unless the admin asks with `?status=all`. |
| `POST` | `/posts` | Admin | Create a post (created as a draft) |
| `PATCH` | `/posts/:postId` | Admin | Edit and / or publish / unpublish |
| `DELETE` | `/posts/:postId` | Admin | Delete a post and its comments |

**Drafts and `?status=all`**: the parameter is only honoured for a token with the `ADMIN` role. Anyone else, or the admin without it, only ever gets published posts. The public blog never sends it; the admin portal sends it on its dashboard, post page and edit page.

```http
GET /posts?status=all
Authorization: Bearer <admin token>
```

**Create a post**: `title` and `content` are required. The author is taken from the token.

**Post content is HTML.** On create and edit, `content` goes through `sanitize-html` **before** it is validated:

| Allowed tags | `p`, `br`, `h2`, `h3`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `blockquote`, `code`, `pre` |
|---|---|
| Allowed attributes | `href` on `a` only, with safe protocols (`http`, `https`, `mailto`…) |

Anything else is removed: `<script>`, `<img>`, event handlers like `onerror`, `javascript:` links, inline styles. Because sanitizing runs first, a content made only of forbidden HTML ends up empty and is rejected with `400 Content is required`.

Comments stay plain text: front-ends display them as text, so they are never interpreted as HTML.

**Edit a post**: every field is optional, send only what changes.

```http
PATCH /posts/3
Authorization: Bearer <admin token>
Content-Type: application/json

{ "published": true }
```

| Field | Effect |
|---|---|
| `title`, `content` | Updated if present (cannot be empty) |
| `published: true` | Publishes the post (`publishedAt` is set, or kept if already published) |
| `published: false` | Turns the post back into a draft (`publishedAt: null`) |

`published` must be a real boolean: `"true"` (string) is rejected.

**Example response**: `GET /posts`

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

Every post route (`GET`, `POST`, `PATCH`) returns posts in this same shape, `author` included. The author's email and password are never returned.

### Comments

Comments are nested under their post.

| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/posts/:postId/comments` | Public | Comments of a post, oldest first |
| `POST` | `/posts/:postId/comments` | Public | Add a comment to a published post |
| `PATCH` | `/posts/:postId/comments/:commentId` | Comment author or admin | Edit the content |
| `DELETE` | `/posts/:postId/comments/:commentId` | Comment author or admin | Delete the comment |

**Post a comment**: `content` is required (250 characters max).

- **Anonymous visitor**: `name` is required too (40 characters max).
- **Logged-in reader**: send no name, the server builds it from the account (`Léa M.`) and links the comment to the user.

```http
POST /posts/3/comments
Content-Type: application/json

{ "name": "Visitor", "content": "Great article!" }
```

`201 Created`

```json
{
  "id": 7,
  "content": "Great article!",
  "name": "Visitor",
  "createdAt": "2026-10-17T09:00:00.000Z",
  "updatedAt": "2026-10-17T09:00:00.000Z",
  "postId": 3,
  "authorId": null
}
```

Anonymous comments have no author, so only the admin can edit or delete them.

---

## Errors

Errors share the same shape:

```json
{ "error": "Post not found" }
```

Validation errors list every invalid field:

```json
{
  "errors": [
    { "type": "field", "msg": "Passwords do not match", "path": "confirmPassword", "location": "body", "value": "..." }
  ]
}
```

| Status | Meaning |
|---|---|
| `400` | Invalid input |
| `401` | Not logged in, invalid or expired token, wrong credentials |
| `403` | Logged in, but not allowed (e.g. not the admin, not the comment's author) |
| `404` | Resource or route not found |
| `409` | Email already used |
| `500` | Server error (details are logged, never sent to the client) |

---

## Data model

- **User**: `firstname`, `lastname`, `email` (unique), hashed `password`, `role` (`USER` by default, or `ADMIN`)
- **Post**: `title`, `content`, `publishedAt` (`null` = draft), belongs to a User
- **Comment**: `content`, `name`, belongs to a Post, optionally linked to a User

Deleting a post deletes its comments. Deleting a user keeps their comments (the `name` stays, the link is removed).

The full schema is in [`prisma/schema.prisma`](prisma/schema.prisma).

## Project structure

```
src/
├── app.js                 # Express app, routers, 404 and error handlers
├── routes/                # URL → middlewares → controller
│   ├── authRouter.js
│   ├── postsRouter.js
│   └── commentsRouter.js  # nested under /posts/:postId
├── controllers/           # Read the request, call queries, send JSON
├── db/
│   ├── prisma.js          # Prisma client instance
│   └── queries.js         # All database access
├── middlewares/
│   ├── auth.js            # isAuth, optionalAuth, isAdmin, canEditComment
│   └── validators.js      # express-validator rules, HTML sanitizing + handleValidation
└── utils/
    ├── httpErrorHandler.js   # HttpError class
    └── verifyPassword.js     # bcrypt helpers
prisma/
├── schema.prisma
├── migrations/
└── seed.js
```

Each request goes through: **route → identity → permissions → validation → controller → queries → JSON response**.

For example, editing a comment:

```js
router.patch("/:commentId", isAuth, canEditComment, validateUpdateComment, handleValidation, updateComment);
```

---

## CORS

The API only answers browsers coming from the origins listed in `CORS_ORIGINS`:

```js
app.use(cors({ origin: process.env.CORS_ORIGINS.split(",") }));
```

The match is exact (protocol, domain and port): `https://example.netlify.app/`, with a trailing slash, does not match the `Origin` header the browser sends. CORS is enforced by the browser only, so it is not a replacement for authentication: tools like `curl` or Postman are not affected.

---

## Deployment

| | |
|---|---|
| API | [Render](https://render.com) — `https://project-blog-api-server-top.onrender.com` |
| Database | PostgreSQL on [Neon](https://neon.tech) |

Environment variables on Render: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `CORS_ORIGINS`. In production, `CORS_ORIGINS` lists both Netlify sites, plus the two localhost origins to test the front-ends locally against the live API.

Values are pasted raw in Render's dashboard: no quotes around them, unlike in a `.env` file.

> On Render's free plan the service sleeps when idle: the first request after a while can take around 30 seconds.

---

## Related repositories

- **Reader client** — the public blog, where visitors read posts and comment — [repo](https://github.com/Aurel-Charles/Project-Blog-API-CLIENT-TOP) · [live](https://project-blog-api-client-top.netlify.app)
- **Admin portal** — the author's dashboard, to write, publish and moderate — [repo](https://github.com/Aurel-Charles/Project-Blog-API-ADMIN-TOP) · [live](https://project-blog-api-admin-top.netlify.app)
