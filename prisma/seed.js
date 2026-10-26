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
      content: [
        "<p>Premier article : je vous explique pourquoi j'ouvre ce blog.</p>",
        "<h2>Un carnet de bord</h2>",
        "<p>J'apprends le développement <strong>full stack</strong> avec The Odin Project, et j'ai envie de garder une trace de ce que je découvre en chemin.</p>",
        "<p>Vous trouverez ici :</p>",
        "<ul><li>des notes sur mes projets web ;</li><li>des retours d'expérience sur le son, en studio comme en live ;</li><li>les erreurs que j'ai faites, et ce qu'elles m'ont appris.</li></ul>",
      ].join(""),
      createdAt: daysAgo(10),
      publishedAt: daysAgo(9),
      authorId: admin.id,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "Mixer un concert de jazz",
      content: [
        "<p>Quelques astuces pour garder la dynamique d'un trio acoustique.</p>",
        "<h2>Avant le concert</h2>",
        "<ol><li>Écouter le groupe <em>sans</em> sonorisation pendant la balance.</li><li>Repérer l'instrument qui porte le morceau.</li><li>Ne renforcer que ce qui manque dans la salle.</li></ol>",
        "<h2>Pendant le concert</h2>",
        "<blockquote><p>Le meilleur mix de jazz, c'est souvent celui qu'on ne remarque pas.</p></blockquote>",
        "<p>Garder la main légère sur les compresseurs : la dynamique, c'est la musique.</p>",
      ].join(""),
      createdAt: daysAgo(6),
      publishedAt: daysAgo(5),
      authorId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Hugo ou Express ?",
      content: [
        "<p>Site statique ou API : comment je choisis pour mes clients.</p>",
        "<h2>Quand Hugo suffit</h2>",
        "<p>Pour un site vitrine dont le contenu change peu, un générateur statique comme <strong>Hugo</strong> est rapide, sûr et presque gratuit à héberger.</p>",
        "<h2>Quand il faut une API</h2>",
        "<p>Dès qu'il y a des comptes, des commentaires ou des données qui changent souvent, une API comme celle de ce blog devient utile. Elle se lance avec une simple commande :</p>",
        "<pre><code>npm run dev</code></pre>",
        "<p>Plus de détails dans la <a href=\"https://gohugo.io/documentation/\">documentation de Hugo</a>.</p>",
      ].join(""),
      createdAt: daysAgo(2),
      publishedAt: daysAgo(1),
      authorId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Brouillon : article en cours",
      content: [
        "<p>Cet article n'est pas encore publié, seul l'admin doit le voir.</p>",
        "<h3>À compléter</h3>",
        "<ul><li>ajouter une introduction ;</li><li>relire le <code>code</code> d'exemple.</li></ul>",
      ].join(""),
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
  // console.log("  lecteur :", reader.email, "(mdp : lecteur123)");
  console.log("  4 posts (3 publiés, 1 brouillon), 2 commentaires");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
