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

  // 4. Posts : 3 publiés + 1 brouillon (contenu en HTML, comme ceux écrits avec TinyMCE)
  const post1 = await prisma.post.create({
    data: {
      title: "Welcome to my blog",
      content: [
        "<p>Hi, I'm Aurel. I'm a freelance web developer and a sound engineer, based in Amiens, France. This blog is where I write about both, and about everything I learn along the way.</p>",
        "<h2>Why a blog?</h2>",
        "<p>I'm working through the <a href=\"https://www.theodinproject.com/\">Full Stack JavaScript path of The Odin Project</a>. Writing things down is the best way I've found to check that I actually understood them. If a post can explain an idea simply, I probably got it.</p>",
        "<p>It's also a project in itself: the blog you're reading runs on an API I built with <strong>Express</strong>, <strong>Prisma</strong> and <strong>PostgreSQL</strong>, and its two front-ends are written in <strong>React</strong>.</p>",
        "<h2>What you'll find here</h2>",
        "<ul><li>notes on web projects, from static sites to full stack apps;</li><li>sound engineering: live mixing, studio sessions, radio;</li><li>the mistakes I make, and what they taught me.</li></ul>",
        "<p>Comments are open to everyone. Create a free account if you'd like your name attached to them, and to read the API documentation.</p>",
      ].join(""),
      createdAt: daysAgo(10),
      publishedAt: daysAgo(9),
      authorId: admin.id,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "Mixing a live jazz trio",
      content: [
        "<p>An acoustic jazz trio is one of the hardest things to mix, precisely because it needs so little. The band already balances itself on stage: the job is mostly not to get in the way.</p>",
        "<h2>Before the show</h2>",
        "<ol><li>Listen to the band <em>without</em> the PA during soundcheck. That's the balance they want.</li><li>Find the instrument that carries the tune. In a piano trio, it's rarely the one you expect.</li><li>Only reinforce what the room is missing. In a small venue, that can be almost nothing.</li></ol>",
        "<h2>During the show</h2>",
        "<p>Keep compression light. A trio breathes: the drummer drops to brushes, the bass takes a solo, everyone comes back in. Squash that and you've removed the music.</p>",
        "<blockquote><p>The best jazz mix is often the one nobody notices.</p></blockquote>",
        "<h3>The double bass</h3>",
        "<p>It's usually the instrument that needs the most help. A good pickup gives definition, a microphone gives the wood. Blending the two, and keeping an eye on feedback around 100–200 Hz, is most of the evening's work.</p>",
      ].join(""),
      createdAt: daysAgo(6),
      publishedAt: daysAgo(5),
      authorId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Hugo or Express?",
      content: [
        "<p>Clients often ask for \"a website\" without knowing what's behind one. Most of the time, the real question is: <strong>does the content change on its own, or only when someone edits it?</strong></p>",
        "<h2>When Hugo is enough</h2>",
        "<p>For a showcase site, a portfolio or a venue's programme, a static site generator like <strong>Hugo</strong> is hard to beat. Pages are built once, served as plain HTML, and hosting is almost free. Paired with a Git-based CMS, the client can still edit their content.</p>",
        "<ul><li>very fast, nothing to compute on each visit;</li><li>very little to secure: no database, no login;</li><li>cheap to host on Netlify or similar.</li></ul>",
        "<h2>When you need an API</h2>",
        "<p>As soon as there are user accounts, comments, or data that changes all the time, a static site isn't enough. That's when a server like this blog's API makes sense. Running it locally is a single command:</p>",
        "<pre><code>npm run dev</code></pre>",
        "<p>The trade-off is real: a server to host, a database to back up, and security to think about at every route.</p>",
        "<h2>My rule of thumb</h2>",
        "<p>Start static. Move to an API when a feature truly needs one, not before. More in the <a href=\"https://gohugo.io/documentation/\">Hugo documentation</a>.</p>",
      ].join(""),
      createdAt: daysAgo(2),
      publishedAt: daysAgo(1),
      authorId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: "Draft: what building this blog taught me",
      content: [
        "<p>This post isn't published yet: only the admin can see it.</p>",
        "<h3>To write</h3>",
        "<ul><li>sanitizing HTML on the server <em>and</em> in the browser;</li><li>why a wrong current password returns a <code>403</code>, not a <code>401</code>;</li><li>ending every other session when the password changes.</li></ul>",
      ].join(""),
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
        content: "Great idea, looking forward to the next posts!",
        name: "Anonymous visitor",
        postId: post1.id,
      },
      {
        content: "Thanks for the tips on the double bass, the pickup + mic blend made a real difference at our last gig.",
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
