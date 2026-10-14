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
├── prisma/
│   ├── schema.prisma
│   └── seed.js                ← crée le compte ADMIN
├── src/
│   ├── app.js                 ← express(), express.json(), cors, montage des routers
│   ├── routes/
│   │   ├── authRouter.js
│   │   ├── postsRouter.js
│   │   └── commentsRouter.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── postsController.js
│   │   └── commentsController.js
│   ├── db/
│   │   ├── prisma.js          ← une seule instance de PrismaClient
│   │   └── queries.js         ← getPublishedPosts(), createComment()…
│   └── middlewares/
│       ├── auth.js            ← optionalAuth, isAuth, isAdmin, canEditComment
│       └── validators.js      ← règles express-validator
├── .env                       ← DATABASE_URL, JWT_SECRET
└── package.json
```

**Chemin d'une requête** : route → middlewares (auth, validation) → controller → queries → réponse JSON.

`cors` : obligatoire, les front-ends seront sur un autre domaine que l'API.

---



## 4. Routes



### Auth


| Route                 | Accès  |
| --------------------- | ------ |
| `POST /auth/register` | public |
| `POST /auth/login`    | public |




### Posts


| Route                   | Accès                                    |
| ----------------------- | ---------------------------------------- |
| `GET /posts`            | public (admin voit aussi les brouillons) |
| `GET /posts/:postId`    | public (brouillon → admin seulement)     |
| `POST /posts`           | admin                                    |
| `PATCH /posts/:postId`  | admin (édition + publier/dépublier)      |
| `DELETE /posts/:postId` | admin                                    |




### Comments (routes imbriquées, toujours au pluriel)


| Route                                       | Accès                                 |
| ------------------------------------------- | ------------------------------------- |
| `GET /posts/:postId/comments`               | public                                |
| `POST /posts/:postId/comments`              | public (auth optionnelle pour le nom) |
| `PATCH /posts/:postId/comments/:commentId`  | admin ou auteur du commentaire        |
| `DELETE /posts/:postId/comments/:commentId` | admin ou auteur du commentaire        |


> Router imbriqué : pense à `express.Router({ mergeParams: true })` dans `commentsRouter.js`, sinon `req.params.postId` sera vide.

---



## 5. Middlewares d'auth



### `isAuth`

1. Lire `req.headers.authorization` et garder ce qu'il y a après `"Bearer "` (`.split(" ")[1]`). Absent → **401**.
2. `jwt.verify(token, process.env.JWT_SECRET)` dans un `try/catch` (⚠️ `verify`, pas `decode`). Invalide ou expiré → **401**.
3. (optionnel) Retrouver le user en base avec l'`id` du payload. Introuvable → **401**.
4. `req.user = user` puis `next()`.



### `optionalAuth`

Même chose, mais en cas d'absence ou d'erreur : juste `next()` sans `req.user`, pas de 401.
→ pour `GET /posts`, `GET /posts/:postId`, `POST .../comments`.

### `isAdmin` (après `isAuth`)

`req.user.role === "ADMIN"` → `next()`, sinon **403**.

### `canEditComment` (après `isAuth`)

1. Chercher le commentaire avec `req.params.commentId`. Introuvable → **404**.
2. `comment.authorId === req.user.id` **ou** `req.user.role === "ADMIN"` → `next()`.
3. Sinon → **403**.

---



## 6. Login — `POST /auth/login`

1. Lire `email` et `password` dans `req.body`.
2. `findUnique({ where: { email } })`. Pas trouvé → **401**.
3. `bcrypt.compare(password, user.password)`. Faux → **401**.
  ⚠️ Même message pour 2 et 3 : « Email ou mot de passe incorrect ».
4. `jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" })`
5. Répondre `{ token }`.

**Payload** : `id` + `role` uniquement. Jamais le password (même hashé), pas d'email. Le token est signé, pas chiffré : tout le monde peut le lire sur jwt.io.

**Plus de** `serializeUser` **/** `deserializeUser` : pas de session, c'est le token qui transporte l'identité.

**Côté client** : stocker le token dans `localStorage`, l'envoyer dans `Authorization: Bearer <token>`. Logout = supprimer le token.

---



## 7. Register — `POST /auth/register`

1. Valider (express-validator) : champs non vides, `isEmail()`, longueur mini du password → **400**.
2. Email déjà pris (`findUnique`) → **409**.
3. `bcrypt.hash(password, 10)`.
4. Créer le user avec firstname, lastname, email, hash. ⚠️ **Jamais** de `role` depuis le body.
5. **201** (message, ou token directement pour connecter dans la foulée).

---



## 8. Codes HTTP utilisés


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


---



## 9. Ordre de travail

- [ ] `npm init`, installer express, prisma, @prisma/client, bcryptjs, jsonwebtoken, express-validator, cors, dotenv
- [ ] Écrire le schéma + première migration
- [ ] Seed du compte ADMIN
- [ ] `app.js` + routes posts (sans auth), tester avec Postman
- [ ] Login + `isAuth` + `isAdmin`, protéger les routes admin
- [ ] `optionalAuth`, filtrage des brouillons
- [ ] Routes comments + `canEditComment`
- [ ] Register (bonus)
- [ ] Suppression de compte (bonus)