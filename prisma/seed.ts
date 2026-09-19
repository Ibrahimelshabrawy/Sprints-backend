import 'dotenv/config';
import { PrismaClient, RoleEnum, TaskStatus, ChatType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Sprints Management Platform database...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.task.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.user.deleteMany();
  await prisma.track.deleteMany();
  await prisma.sprint.deleteMany();

  const passwordHash = await bcrypt.hash(
    process.env.SEED_DEFAULT_PASSWORD!,
    Number(process.env.SALT_ROUNDS),
  );

  // 1. Create Initial ADMIN
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Tarek (Admin)',
      email: 'admin@sprints.com',
      password: passwordHash,
      role: RoleEnum.ADMIN,
      trackId: null,
    },
  });

  // 2. Create Sprint 1
  const now = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(now.getDate() + 14);

  const sprint = await prisma.sprint.create({
    data: {
      name: 'Sprint 1 - Foundation & Core Architecture',
      description: 'First official cycle focused on authentication, foundational CRUD, and UI scaffolding.',
      startDate: now,
      endDate: twoWeeksLater,
    },
  });

  // 3. Create General Chat for Sprint 1
  const generalChat = await prisma.chat.create({
    data: {
      type: ChatType.GENERAL,
      sprintId: sprint.id,
      trackId: null,
    },
  });

  // 4. Create Tracks for Sprint 1
  const backendTrack = await prisma.track.create({
    data: {
      name: 'Backend Track',
      description: 'NestJS, Prisma, and PostgreSQL API services.',
      sprintId: sprint.id,
    },
  });

  const frontendTrack = await prisma.track.create({
    data: {
      name: 'Frontend Track',
      description: 'React, TypeScript, and Tailwind/Vanilla CSS components.',
      sprintId: sprint.id,
    },
  });

  const flutterTrack = await prisma.track.create({
    data: {
      name: 'Flutter Track',
      description: 'Cross-platform mobile application architecture.',
      sprintId: sprint.id,
    },
  });

  // 5. Create Track Chats
  const backendChat = await prisma.chat.create({
    data: {
      type: ChatType.TRACK,
      sprintId: sprint.id,
      trackId: backendTrack.id,
    },
  });

  const frontendChat = await prisma.chat.create({
    data: {
      type: ChatType.TRACK,
      sprintId: sprint.id,
      trackId: frontendTrack.id,
    },
  });

  const flutterChat = await prisma.chat.create({
    data: {
      type: ChatType.TRACK,
      sprintId: sprint.id,
      trackId: flutterTrack.id,
    },
  });

  // 6. Create Students and assign to Tracks
  const omar = await prisma.user.create({
    data: {
      name: 'Omar Mahmoud',
      email: 'omar@sprints.com',
      password: passwordHash,
      role: RoleEnum.STUDENT,
      trackId: backendTrack.id,
    },
  });

  const salma = await prisma.user.create({
    data: {
      name: 'Salma El-Sayed',
      email: 'salma@sprints.com',
      password: passwordHash,
      role: RoleEnum.STUDENT,
      trackId: backendTrack.id,
    },
  });

  const ahmed = await prisma.user.create({
    data: {
      name: 'Ahmed Hassan',
      email: 'ahmed@sprints.com',
      password: passwordHash,
      role: RoleEnum.STUDENT,
      trackId: frontendTrack.id,
    },
  });

  const nour = await prisma.user.create({
    data: {
      name: 'Nour Ali',
      email: 'nour@sprints.com',
      password: passwordHash,
      role: RoleEnum.STUDENT,
      trackId: frontendTrack.id,
    },
  });

  const karim = await prisma.user.create({
    data: {
      name: 'Karim Youssef',
      email: 'karim@sprints.com',
      password: passwordHash,
      role: RoleEnum.STUDENT,
      trackId: flutterTrack.id,
    },
  });

  // 7. Create Tasks representing the full lifecycle
  // Backend Task 1: APPROVED
  await prisma.task.create({
    data: {
      title: 'Implement Authentication & JWT guards',
      description: 'Setup bcrypt password hashing, token generation, and role authorization guard.',
      status: TaskStatus.APPROVED,
      trackId: backendTrack.id,
      assigneeId: omar.id,
      submissionNotes: 'All endpoints verified via Postman test suite with unit tests.',
      submissionUrl: 'https://github.com/sprints/backend/pull/1',
      score: 95,
      feedback: 'Excellent clean architecture and adherence to security standards!',
    },
  });

  // Backend Task 2: SUBMITTED (Ready for review)
  await prisma.task.create({
    data: {
      title: 'Design Prisma schema and migrations',
      description: 'Model the 6 required entities with exact relations and cascade rules.',
      status: TaskStatus.SUBMITTED,
      trackId: backendTrack.id,
      assigneeId: salma.id,
      submissionNotes: 'Database migrations pushed and seeded. Ready for code review.',
      submissionUrl: 'https://github.com/sprints/backend/pull/2',
    },
  });

  // Frontend Task 1: IN_PROGRESS
  await prisma.task.create({
    data: {
      title: 'Connect Sprint Dashboard to REST endpoints',
      description: 'Replace mock storage with real fetch calls to backend API.',
      status: TaskStatus.IN_PROGRESS,
      trackId: frontendTrack.id,
      assigneeId: ahmed.id,
    },
  });

  // Frontend Task 2: TODO
  await prisma.task.create({
    data: {
      title: 'Implement Chat UI with realtime refresh',
      description: 'Create human-to-human messaging view for General and Track chats.',
      status: TaskStatus.TODO,
      trackId: frontendTrack.id,
      assigneeId: nour.id,
    },
  });

  // Flutter Task 1: TODO
  await prisma.task.create({
    data: {
      title: 'Setup Mobile State Management with Riverpod',
      description: 'Implement models and HTTP repositories for mobile sprint views.',
      status: TaskStatus.TODO,
      trackId: flutterTrack.id,
      assigneeId: karim.id,
    },
  });

  // 8. Create Realistic Human-to-Human Messages
  // General Chat
  await prisma.message.create({
    data: {
      content: 'Welcome everyone to Sprint 1! Please review your assigned track tasks.',
      senderId: admin.id,
      chatId: generalChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Thank you Dr. Tarek! The backend track has started working on the APIs.',
      senderId: omar.id,
      chatId: generalChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Frontend team is ready to connect the endpoints once backend is live.',
      senderId: ahmed.id,
      chatId: generalChat.id,
    },
  });

  // Backend Track Chat
  await prisma.message.create({
    data: {
      content: 'Hey Salma, I finished the Auth guard and submitted the PR.',
      senderId: omar.id,
      chatId: backendChat.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Great Omar! I just pushed the Prisma schema updates and submitted for review.',
      senderId: salma.id,
      chatId: backendChat.id,
    },
  });

  // Frontend Track Chat
  await prisma.message.create({
    data: {
      content: 'Hi Nour, I am starting the API client integration on the dashboard today.',
      senderId: ahmed.id,
      chatId: frontendChat.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log('Seed Accounts:');
  console.log(`  Admin:   admin@sprints.com   / ${process.env.SEED_DEFAULT_PASSWORD}`);
  console.log(`  Student: omar@sprints.com    / ${process.env.SEED_DEFAULT_PASSWORD} (Backend Track)`);
  console.log(`  Student: salma@sprints.com   / ${process.env.SEED_DEFAULT_PASSWORD} (Backend Track)`);
  console.log(`  Student: ahmed@sprints.com   / ${process.env.SEED_DEFAULT_PASSWORD} (Frontend Track)`);
  console.log(`  Student: nour@sprints.com    / ${process.env.SEED_DEFAULT_PASSWORD} (Frontend Track)`);
  console.log(`  Student: karim@sprints.com   / ${process.env.SEED_DEFAULT_PASSWORD} (Flutter Track)`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
