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

  // 2. Un lecteur inscrit, pour tester les commentaires connectés
  const readerPassword = await bcrypt.hash("lecteur123", 10);
  const reader = await prisma.user.upsert({
    where: { email: "lecteur@test.fr" },
    update: {},
    create: {
      firstname: "Léa",
      lastname: "Martin",
      email: "lecteur@test.fr",
      password: readerPassword,
    },
  });

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

  // 5. Commentaires : un anonyme, un lecteur connecté
  await prisma.comment.createMany({
    data: [
      {
        content: "Super initiative, hâte de lire la suite !",
        name: "Visiteur anonyme",
        postId: post1.id,
      },
      {
        content: "Merci pour les conseils sur le trio.",
        name: reader.firstname,
        postId: post2.id,
        authorId: reader.id,
      },
    ],
  });

  console.log("Seed terminé :");
  console.log("  admin   :", admin.email);
  console.log("  lecteur :", reader.email, "(mdp : lecteur123)");
  console.log("  4 posts (3 publiés, 1 brouillon), 2 commentaires");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
