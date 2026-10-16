# Blog API — Fiche récap du serveur

Blog perso : **1 admin** (moi) qui écrit, des **visiteurs** qui lisent et commentent (anonymes ou inscrits).
3 repos séparés : `blog-api`, `blog-client`, `blog-admin`.

---

## 1. Décisions clés

- **Rôle** : enum `Role` (`USER` / `ADMIN`), défaut `USER`. Le compte admin est créé par le **seed**, jamais par une route.
- **Publié / brouillon** : pas de booléen, juste `publishedAt`.
  - brouillon → `publishedAt: null`
  - publier → `publishedAt: new Date()` (date posée **par le serveur**, le front envoie juste `{ "published": true }`)
  - dépublier → `publishedAt: null`
  - lister les publiés → `where: { publishedAt: { not: null } }`
- **Commentaires** : `name` toujours rempli.
  - user connecté → le serveur prend le nom depuis `req.user` (et `authorId` depuis le token, **jamais** depuis le body)
  - anonyme → `name` obligatoire dans le body (express-validator)
- **Suppression** :
  - post supprimé → ses commentaires aussi (`onDelete: Cascade`)
  - user supprimé (bonus) → ses commentaires restent, `authorId` passe à null (`onDelete: SetNull`), le `name` reste

---



## 2. Schéma Prisma

```prisma
enum Role {
  USER
  ADMIN
}

model User {
  id        Int       @id @default(autoincrement())
  firstname String
  lastname  String
  email     String    @unique
  password  String
  role      Role      @default(USER)
  createdAt DateTime  @default(now())
  posts     Post[]
  comments  Comment[]
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  content     String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?
  author      User      @relation(fields: [authorId], references: [id])
  authorId    Int
  comments    Comment[]
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    Int
  author    User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)
  authorId  Int?
}
```

---



## 3. Arborescence

```
blog-api/
├── generated/prisma/           ← client Prisma généré (client.ts), ignoré par git
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js                 ← admin + lecteur test + 4 posts + 2 commentaires
├── prisma7.config.js
├── src/
│   ├── app.js                  ← express(), cors, express.json, routers, gestionnaire d'erreurs
│   ├── routes/
│   │   ├── authRouter.js
│   │   ├── postsRouter.js
│   │   └── commentsRouter.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── postsController.js
│   │   └── commentsController.js
│   ├── db/                     ← la couche « model »
│   │   ├── prisma.js           ← une seule instance de PrismaClient
│   │   └── queries.js
│   ├── middlewares/
│   │   ├── auth.js             ← isAuth, isAdmin, optionalAuth, canEditComment
│   │   └── validators.js       ← règles express-validator
│   └── utils/
│       ├── httpErrorHandler.js ← classe HttpError(message, statusCode)
│       └── verifyPassword.js   ← createPassword (hash), verifyPassword (compare)
├── .env                        ← DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
└── package.json                ← "type": "module", scripts dev (nodemon) et seed
```

**Chemin d'une requête** : route → middlewares (auth, validation) → controller → queries → réponse JSON.

`cors` : obligatoire, les front-ends seront sur un autre domaine que l'API. CORS ne concerne que les navigateurs (Postman l'ignore).

### Points techniques à retenir

- **ESM** : toujours l'extension `.js` dans les imports de tes fichiers (`"../db/queries.js"`).
- **Prisma 7** génère du TypeScript : `import { PrismaClient } from "../../generated/prisma/client.ts"`. Node ≥ 22.18 le lit directement. Au déploiement, imposer Node ≥ 22.18 (`"engines": { "node": ">=22.18" }` dans `package.json`).
- **Seed** : `npm run seed`. ⚠️ Il fait `deleteMany()` sur les posts, donc il efface aussi les posts créés à la main.
- **Router** : toujours monté avec `app.use("/auth", authRouter)`, jamais `app.post(...)`.
- **Express 5** : une erreur lancée (`throw`) dans un controller `async` arrive toute seule dans le gestionnaire d'erreurs, pas besoin de `try/catch` ni de `next(err)`.
- **Prisma** `select` : `{ firstname: true }`, pas `{ firstname }` (sinon JS cherche une variable).
- `req.params` arrive toujours en string : `Number(req.params.postId)` + `Number.isInteger()`.



### Gestion des erreurs

```js
// src/utils/httpErrorHandler.js
export class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// dans un controller
if (!post) throw new HttpError("Post introuvable", 404);

// app.js, après toutes les routes
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});
```

- `res.status()`, pas `res.statusCode()` (c'est une propriété, pas une fonction).
- Une erreur venant d'une librairie (jsonwebtoken, Prisma…) n'a pas de `statusCode` → 500. Pour renvoyer le bon code, l'attraper et la remplacer par une `HttpError`.

---



## 4. Nommage

La **query** décrit ce qu'elle fait en base, le **controller** décrit l'action HTTP. Les queries de création s'appellent `insert...` pour éviter un conflit de nom avec le controller `create...`.


| Fait | Route                            | Controller      | Query                  |
| ---- | -------------------------------- | --------------- | ---------------------- |
| ✅    | `GET /posts`                     | `getPosts`      | `getPublishedPosts`    |
| ✅    | `GET /posts/:postId`             | `getPostById`   | `getPublishedPostById` |
| ✅    | `POST /posts`                    | `createPost`    | `insertPost`           |
| ✅    | `PATCH /posts/:postId`           | `updatePost`    | `updatePostById`       |
| ✅    | `DELETE /posts/:postId`          | `deletePost`    | `deletePostById`       |
| ✅    | `POST /auth/login`               | `login`         | `getUserByEmail`       |
| ⬜    | `POST /auth/register`            | `register`      | `insertUser`           |
| ✅    | `GET /posts/:postId/comments`    | `getComments`   | `getCommentsByPostId`  |
| ✅    | `POST /posts/:postId/comments`   | `createComment` | `insertComment`        |
| ✅    | `PATCH .../comments/:commentId`  | `updateComment` | `updateCommentById`    |
| ✅    | `DELETE .../comments/:commentId` | `deleteComment` | `deleteCommentById`    |


Pour cocher une ligne : remplacer ⬜ par ✅.

---



## 5. Routes



### Auth


| Route                 | Accès    |
| --------------------- | -------- |
| `POST /auth/register` | public   |
| `POST /auth/login`    | public ✅ |




### Posts


| Route                   | Accès                                      |
| ----------------------- | ------------------------------------------ |
| `GET /posts`            | public (admin voit aussi les brouillons) ✅ |
| `GET /posts/:postId`    | public (brouillon → admin seulement) ✅     |
| `POST /posts`           | admin                                      |
| `PATCH /posts/:postId`  | admin (édition + publier/dépublier)        |
| `DELETE /posts/:postId` | admin                                      |




### Comments (routes imbriquées, toujours au pluriel)


| Route                                       | Accès                                 |
| ------------------------------------------- | ------------------------------------- |
| `GET /posts/:postId/comments`               | public                                |
| `POST /posts/:postId/comments`              | public (auth optionnelle pour le nom) |
| `PATCH /posts/:postId/comments/:commentId`  | admin ou auteur du commentaire        |
| `DELETE /posts/:postId/comments/:commentId` | admin ou auteur du commentaire        |


> Router imbriqué : pense à `express.Router({ mergeParams: true })` dans `commentsRouter.js`, sinon `req.params.postId` sera vide.

---



## 6. Middlewares d'auth



### `isAuth` ✅

1. Lire `req.headers.authorization` et garder ce qu'il y a après `"Bearer "` (`.split(" ")[1]`). Absent → **401**.
2. `jwt.verify(token, process.env.JWT_SECRET)` dans un `try/catch` (⚠️ `verify`, pas `decode`). Invalide ou expiré → **401**.
3. (optionnel) Retrouver le user en base avec l'`id` du payload. Introuvable → **401**.
4. `req.user = payload` puis `next()`.

```js
export function isAuth(req, res, next) {
  const bearerHeader = req.headers.authorization;
  if (!bearerHeader) throw new HttpError("Login required", 401);

  const token = bearerHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError("Invalid or expired token", 401);
  }
  next();
}
```

⚠️ Un seul `next()`, à la fin. Ne pas mélanger `jwt.verify` avec callback et `try/catch` : la forme sans callback **renvoie** le payload ou **lance** une erreur.

### `isAdmin` ✅ (après `isAuth`)

`req.user.role === "ADMIN"` → `next()`, sinon **403**.

- **401** = « je ne sais pas qui tu es » → le front renvoie vers le login.
- **403** = « je sais qui tu es, mais tu n'as pas le droit » → se reconnecter ne sert à rien.

Ordre sur la route : `router.post("/", isAuth, isAdmin, createPost)`. `isAdmin` lit `req.user`, qui n'existe qu'après `isAuth`.

### `optionalAuth`

Même chose qu'`isAuth`, mais en cas d'absence ou d'erreur : juste `next()` sans `req.user`, pas de 401.
→ pour `GET /posts`, `GET /posts/:postId`, `POST .../comments`.

### `canEditComment` (après `isAuth`)

1. Chercher le commentaire avec `req.params.commentId`. Introuvable → **404**.
2. `comment.authorId === req.user.id` **ou** `req.user.role === "ADMIN"` → `next()`.
3. Sinon → **403**.

---



## 7. Login — `POST /auth/login` ✅

1. Lire `email` et `password` dans `req.body`.
2. `getUserByEmail(email)` (`findUnique`, renvoie le hash : ce user ne part **jamais** dans un `res.json`). Pas trouvé → **401**.
3. `verifyPassword(password, user.password)` (`bcrypt.compare`). Faux → **401**.
  ⚠️ Même message pour 2 et 3 : « Email or Password is wrong ».
4. `jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" })`
5. Répondre `{ token }` (clé `token` : c'est ce que le front et Postman lisent).

**À faire** : sans `email` dans le body, Prisma plante → 500. À régler avec express-validator (→ 400).

**Payload** : `id` + `role` uniquement. Jamais le password (même hashé), pas d'email. Le token est signé, pas chiffré : tout le monde peut le lire sur jwt.io.

**Plus de** `serializeUser` **/** `deserializeUser` : pas de session, c'est le token qui transporte l'identité.

**Librairies** : `jsonwebtoken` à la main (choisi). `express-jwt` ou `passport-jwt` ne remplacent que la vérification (`isAuth`), jamais la création du token.

### Côté client

```js
localStorage.setItem("token", data.token);                              // login
headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }  // chaque requête
localStorage.removeItem("token");                                       // logout
```

Limite : un script injecté (faille XSS) peut lire le `localStorage`. L'alternative plus sûre (cookie `httpOnly`) est compliquée entre deux domaines : hors périmètre de ce projet.

---



## 8. Register — `POST /auth/register`

1. Valider (express-validator) : champs non vides, `isEmail()`, longueur mini du password → **400**.
2. Email déjà pris (`findUnique`) → **409**.
3. `createPassword(password)` (`bcrypt.hash(password, 10)`).
4. Créer le user avec firstname, lastname, email, hash. ⚠️ **Jamais** de `role` depuis le body.
5. **201** (message, ou token directement pour connecter dans la foulée).

---



## 9. Codes HTTP utilisés


| Code | Quand                                                |
| ---- | ---------------------------------------------------- |
| 200  | OK (GET, PATCH)                                      |
| 201  | Créé (POST)                                          |
| 204  | Supprimé, pas de contenu (DELETE)                    |
| 400  | Données invalides (validation)                       |
| 401  | Pas connecté / token invalide / mauvais identifiants |
| 403  | Connecté mais pas le droit                           |
| 404  | Ressource introuvable                                |
| 409  | Conflit (email déjà utilisé)                         |
| 500  | Le serveur a planté (jamais la faute du client)      |


---



## 10. Postman

- Collection **Blog-API**, variables : `admin_email`, `admin_password`, `reader_email`, `reader_password` (type secret), `token`.
- Requêtes « login Admin » et « login reader », body : `{ "email": "{{admin_email}}", "password": "{{admin_password}}" }`.
- Onglet **Scripts → Post-response** des logins :
  ```js
  const data = pm.response.json();
  pm.collectionVariables.set("token", data.token);
  ```
- Collection → **Authorization** → **Bearer Token** → `{{token}}`. Chaque requête en **Inherit auth from parent**.
- Tester sans token : passer la requête en **No Auth**.
- Lecteur de test (seed) : `lecteur@test.fr` / `lecteur123`.
- Ne jamais exporter/partager la collection avec le vrai mot de passe admin.

---



## 11. Ordre de travail

- [x] `npm init`, installer express, prisma@7, @prisma/client@7, @prisma/adapter-pg, pg, bcryptjs, jsonwebtoken, express-validator, cors, dotenv, nodemon
- [x] Écrire le schéma + première migration
- [x] Seed (admin, lecteur, posts, commentaires)
- [x] `app.js` + gestionnaire d'erreurs + `HttpError`
- [x] `GET /posts` et `GET /posts/:postId` (publics, publiés uniquement)
- [x] Login + `isAuth` + `isAdmin`
- [ ] Supprimer les routes de test (`/me`, `/admin-test`)
- [ ] `POST /posts` (admin)
- [ ] `PATCH /posts/:postId` (édition + publier/dépublier)
- [ ] `DELETE /posts/:postId`
- [ ] `optionalAuth` : l'admin voit aussi les brouillons
- [ ] Routes comments + `canEditComment` (`mergeParams: true`)
- [ ] Validation express-validator (login, posts, commentaires)
- [ ] Register (bonus)
- [ ] Suppression de compte (bonus)