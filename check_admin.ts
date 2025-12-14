
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'admin' },
        { email: 'admin@example.com' } // Common default
      ]
    }
  });

  if (user) {
    console.log(`User found: ${user.username} (${user.email})`);
    console.log(`Role: ${user.role}`);
  } else {
    console.log('User admin not found.');
  }
  
  const count = await prisma.user.count();
  console.log(`Total users in DB: ${count}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
