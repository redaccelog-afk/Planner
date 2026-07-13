import { PrismaClient } from "../src/generated/client";
import { hashPassword } from "@trivora/shared";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword("demo1234");

  const host = await prisma.user.upsert({
    where: { email: "demo@trivora.app" },
    update: {},
    create: {
      email: "demo@trivora.app",
      name: "Hôte Démo",
      passwordHash,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      ownerId: host.id,
      title: "Culture générale — Démo",
      description: "Un quiz de démonstration pour découvrir Trivora",
      visibility: "PUBLIC",
      category: "Culture générale",
      questions: {
        create: [
          {
            order: 0,
            type: "MCQ",
            text: "Quelle est la capitale du Maroc ?",
            timeLimitSec: 20,
            points: 1000,
            choices: {
              create: [
                { order: 0, text: "Rabat", isCorrect: true },
                { order: 1, text: "Casablanca", isCorrect: false },
                { order: 2, text: "Marrakech", isCorrect: false },
                { order: 3, text: "Fès", isCorrect: false },
              ],
            },
          },
          {
            order: 1,
            type: "TRUE_FALSE",
            text: "La Terre est plate.",
            timeLimitSec: 10,
            points: 500,
            choices: {
              create: [
                { order: 0, text: "Vrai", isCorrect: false },
                { order: 1, text: "Faux", isCorrect: true },
              ],
            },
          },
          {
            order: 2,
            type: "POLL",
            text: "Quel est ton dessert préféré ?",
            timeLimitSec: 15,
            points: 0,
            choices: {
              create: [
                { order: 0, text: "Chocolat" },
                { order: 1, text: "Fruits" },
                { order: 2, text: "Glace" },
                { order: 3, text: "Pâtisserie" },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seed OK — host=${host.email} quiz=${quiz.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
