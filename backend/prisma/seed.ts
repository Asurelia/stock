import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.userProfile.findFirst({
    where: { role: 'gerant' },
  })

  if (existing) {
    console.log('Admin user already exists:', existing.display_name)
    return
  }

  const hashedPin = await bcrypt.hash('0000', 10)

  const admin = await prisma.userProfile.create({
    data: {
      display_name: 'Gérant',
      role: 'gerant',
      avatar_emoji: '👨‍💼',
      pin_code: hashedPin,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  })

  console.log('Created admin user:', admin.display_name, '(PIN: 0000)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
