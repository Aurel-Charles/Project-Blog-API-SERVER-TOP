import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

// Petite aide : une date il y a N jours
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  // 1. Admin (upsert : rejouable sans erreur)
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL },
    update: {},
    create: {
      firstname: "Aurel",
      lastname: "Charles",
      email: process.env.ADMIN_EMAIL,
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // 2. Un lecteur de test, pour tester les commentaires connectés.
  //    Créé seulement si READER_EMAIL et READER_PASSWORD sont définis (en local) :
  //    en production, on ne les définit pas, et ce compte n'existe jamais.
  let reader = null;
  if (process.env.READER_EMAIL && process.env.READER_PASSWORD) {
    const readerPassword = await bcrypt.hash(process.env.READER_PASSWORD, 10);
    reader = await prisma.user.upsert({
      where: { email: process.env.READER_EMAIL },
      update: {},
      create: {
        firstname: "Léa",
        lastname: "Martin",
        email: process.env.READER_EMAIL,
        password: readerPassword,
      },
    });
  }

  // 3. On repart de zéro pour les posts (les commentaires partent avec, grâce au Cascade)
  await prisma.post.deleteMany();

  // 4. Posts : 3 publiés + 1 brouillon
  const post1 = await prisma.post.create({
    data: {
      title: "Bienvenue sur mon blog",
      content: "Premier article : je vous explique pourquoi j'ouvre ce blog.",
      createdAt: daysAgo(10),
      publishedAt: daysAgo(9),
      authorId: admin.id,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "Mixer un concert de jazz",
      content: "Quelques astuces pour garder la dynamique d'un trio acoustique.",
      createdAt: daysAgo(6),
      publishedAt: daysAgo(5),
      authorId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Hugo ou Express ?",
      content: "Site statique ou API : comment je choisis pour mes clients.",
      createdAt: daysAgo(2),
      publishedAt: daysAgo(1),
      authorId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Brouillon : article en cours",
      content: "Cet article n'est pas encore publié, seul l'admin doit le voir.",
      createdAt: daysAgo(1),
      publishedAt: null,
      authorId: admin.id,
    },
  });

  // 5. Commentaires : un anonyme, et un du lecteur de test
  //    (anonyme lui aussi, avec le même nom, si le lecteur n'existe pas)
  await prisma.comment.createMany({
    data: [
      {
        content: "Super initiative, hâte de lire la suite !",
        name: "Visiteur anonyme",
        postId: post1.id,
      },
      {
        content: "Merci pour les conseils sur le trio.",
        name: "Léa M.",
        postId: post2.id,
        authorId: reader ? reader.id : null,
      },
    ],
  });

  console.log("Seed terminé :");
  console.log("  admin   :", admin.email);
  console.log("  lecteur :", reader ? reader.email : "non créé (READER_EMAIL / READER_PASSWORD absents)");
  console.log("  4 posts (3 publiés, 1 brouillon), 2 commentaires");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
