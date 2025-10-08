import { PrismaClient, ConfigType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123!", 12);
    const admin = await prisma.user.upsert({
      where: { email: "admin@blockvote.com" },
      update: {},
      create: {
        username: "admin",
        email: "admin@blockvote.com",
        passwordHash: adminPassword,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log("✅ Admin user created:", admin.email);

    // Create organization user
    const orgPassword = await bcrypt.hash("org123!", 12);
    const organization = await prisma.user.upsert({
      where: { email: "org@blockvote.com" },
      update: {},
      create: {
        username: "organization1",
        email: "org@blockvote.com",
        passwordHash: orgPassword,
        role: "ORGANIZATION",
        status: "ACTIVE",
      },
    });
    console.log("✅ Organization user created:", organization.email);

    // Create voter users
    const voterPassword = await bcrypt.hash("voter123!", 12);
    const voters = [];
    for (let i = 1; i <= 5; i++) {
      const voter = await prisma.user.upsert({
        where: { email: `voter${i}@blockvote.com` },
        update: {},
        create: {
          username: `voter${i}`,
          email: `voter${i}@blockvote.com`,
          passwordHash: voterPassword,
          role: "VOTER",
          status: "ACTIVE",
        },
      });
      voters.push(voter);
    }
    console.log("✅ Voter users created:", voters.length);

    // Create a sample election
    const election = await prisma.election.upsert({
      where: { id: 1 },
      update: {},
      create: {
        title: "Student Council President Election 2024",
        description:
          "Annual election for the student council president position.",
        organizationId: organization.id,
        status: "DRAFT",
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // One week from now
      },
    });
    console.log("✅ Sample election created:", election.title);

    // Create candidates for the election
    const candidates = await Promise.all([
      prisma.candidate.upsert({
        where: { id: 1 },
        update: {},
        create: {
          electionId: election.id,
          name: "Alice Johnson",
          description:
            "Experienced leader with focus on student welfare and academic excellence.",
        },
      }),
      prisma.candidate.upsert({
        where: { id: 2 },
        update: {},
        create: {
          electionId: election.id,
          name: "Bob Smith",
          description:
            "Advocate for better campus facilities and student engagement activities.",
        },
      }),
      prisma.candidate.upsert({
        where: { id: 3 },
        update: {},
        create: {
          electionId: election.id,
          name: "Carol Davis",
          description:
            "Champion of sustainability initiatives and digital innovation in education.",
        },
      }),
    ]);
    console.log("✅ Candidates created:", candidates.length);

    // Register voters for the election
    const electionVoters = await Promise.all(
      voters.map((voter, index) =>
        prisma.electionVoter.upsert({
          where: {
            electionId_email: {
              electionId: election.id,
              email: voter.email,
            },
          },
          update: {},
          create: {
            electionId: election.id,
            name: `Voter ${index + 1}`,
            email: voter.email,
            username: voter.username,
            password: "voter123!", // In production, this would be generated securely
          },
        }),
      ),
    );
    console.log("✅ Election voters registered:", electionVoters.length);

    // Create election statistics
    await prisma.electionStatistics.upsert({
      where: { electionId: election.id },
      update: {},
      create: {
        electionId: election.id,
        totalRegisteredVoters: voters.length,
        totalVotesCast: 0,
        participationRate: 0.0,
      },
    });
    console.log("✅ Election statistics initialized");

    // Create system configuration
    const systemConfigs: Array<{
      key: string;
      value: string;
      type: ConfigType;
    }> = [
      { key: "BLOCKCHAIN_DIFFICULTY", value: "4", type: "NUMBER" },
      { key: "MAX_VOTES_PER_BLOCK", value: "100", type: "NUMBER" },
      { key: "PROOF_OF_WORK_ENABLED", value: "true", type: "BOOLEAN" },
      { key: "EMAIL_NOTIFICATIONS_ENABLED", value: "true", type: "BOOLEAN" },
      { key: "SYSTEM_MAINTENANCE_MODE", value: "false", type: "BOOLEAN" },
      { key: "DEFAULT_ELECTION_DURATION_DAYS", value: "7", type: "NUMBER" },
      { key: "MIN_CANDIDATES_PER_ELECTION", value: "2", type: "NUMBER" },
      { key: "MAX_CANDIDATES_PER_ELECTION", value: "10", type: "NUMBER" },
    ];

    for (const config of systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: {
          key: config.key,
          value: config.value,
          type: config.type,
        },
      });
    }
    console.log(
      "✅ System configuration created:",
      systemConfigs.length,
      "entries",
    );

    // Initialize system statistics
    await prisma.systemStatistics.upsert({
      where: { id: 1 },
      update: {},
      create: {
        totalUsers: await prisma.user.count(),
        totalElections: await prisma.election.count(),
        totalVotes: 0,
        totalBlocks: 0,
        averageBlockTime: 0,
        systemUptime: 0,
      },
    });
    console.log("✅ System statistics initialized");

    // Create sample audit logs
    const auditLogs = [
      {
        userId: admin.id,
        action: "LOGIN",
        resource: "USER",
        resourceId: admin.id,
        details: "Admin user logged in",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 (Seeding Script)",
      },
      {
        userId: organization.id,
        action: "CREATE",
        resource: "ELECTION",
        resourceId: election.id,
        details: "Created new election: " + election.title,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 (Seeding Script)",
      },
    ];

    for (const log of auditLogs) {
      await prisma.auditLog.create({ data: log });
    }
    console.log("✅ Sample audit logs created:", auditLogs.length);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Summary:");
    console.log(
      `👤 Users created: ${voters.length + 2} (1 admin, 1 organization, ${voters.length} voters)`,
    );
    console.log(`🗳️  Elections created: 1`);
    console.log(`🏃‍♂️ Candidates created: ${candidates.length}`);
    console.log(`📊 Election voters registered: ${electionVoters.length}`);
    console.log(`⚙️  System configs created: ${systemConfigs.length}`);
    console.log(`📈 Statistics initialized: 1`);
    console.log(`📝 Audit logs created: ${auditLogs.length}`);

    console.log("\n🔑 Default login credentials:");
    console.log("Admin: admin@blockvote.com / admin123!");
    console.log("Organization: org@blockvote.com / org123!");
    console.log("Voters: voter1@blockvote.com / voter123! (voter1-voter5)");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
