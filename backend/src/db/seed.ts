import prisma from './client.js'

async function seed() {
  const existingUser = await prisma.user.findUnique({ where: { id: 'default-user' } })
  if (existingUser) {
    console.log('Database already seeded. Skipping.')
    return
  }

  // Delete any previously auto-created user with different ID
  const oldUser = await prisma.user.findFirst()
  if (oldUser) {
    await prisma.user.delete({ where: { id: oldUser.id } })
  }

  const user = await prisma.user.create({
    data: {
      id: 'default-user',
      name: 'Default User',
    },
  })

  await prisma.userProfile.create({
    data: {
      userId: user.id,
      age: 30,
      gender: 'male',
      heightCm: 175,
      currentWeightKg: 80,
      targetWeightKg: 72,
      hasTrainingExperience: true,
      weeklyTrainingDays: 4,
      cardioMinutesPerWeek: 120,
      sleepHoursPerNight: 7,
      dietStyle: 'omnivore',
      activityLevel: 'moderate',
      onboardingComplete: false,
    },
  })

  await prisma.providerSettings.create({
    data: {
      userId: user.id,
      chatProvider: 'claude',
      chatModel: 'claude-sonnet-4-6',
      sttProvider: 'faster_whisper',
      ttsProvider: 'mimo_v2.5',
      theme: 'dark',
      language: 'zh-CN',
    },
  })

  console.log('Seed complete. Default user created:', user.id)
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
