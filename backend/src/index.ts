import 'dotenv/config'
import app from './app'
import { prisma, initDB } from './lib/prisma'

const PORT = parseInt(process.env.PORT || '3001', 10)

async function main() {
  await initDB()
  console.log('SQLite initialized with WAL mode + foreign keys')

  const server = app.listen(PORT, () => {
    console.log(`StockPro backend running on http://localhost:${PORT}`)
  })

  const shutdown = async () => {
    console.log('\nShutting down...')
    await prisma.$disconnect()
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
