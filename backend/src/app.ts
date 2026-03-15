import express from 'express'
import cors from 'cors'
import path from 'path'

import { optionalAuth } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'

import authRoutes from './routes/auth'
import productsRoutes from './routes/products'
import outputsRoutes from './routes/outputs'
import suppliersRoutes from './routes/suppliers'
import deliveriesRoutes from './routes/deliveries'
import recipesRoutes from './routes/recipes'
import menusRoutes from './routes/menus'
import temperatureRoutes from './routes/temperature'
import traceabilityRoutes from './routes/traceability'
import recurringOutputsRoutes from './routes/recurringOutputs'
import staffRoutes from './routes/staff'
import scheduleEventsRoutes from './routes/scheduleEvents'
import userProfilesRoutes from './routes/userProfiles'
import permissionsRoutes from './routes/permissions'
import activityLogRoutes from './routes/activityLog'
import analyticsRoutes from './routes/analytics'
import backupRoutes from './routes/backup'
import productLotsRoutes from './routes/productLots'
import priceHistoryRoutes from './routes/priceHistory'
import llmRoutes from './routes/llm'
import productMappingsRoutes from './routes/productMappings'

const app = express()

app.use(cors({
  origin: true,  /* CUSTOMIZATION: Set to specific origins in production, e.g. ['https://yourdomain.com'] */
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use(optionalAuth)

app.use('/api/auth', authRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/outputs', outputsRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/deliveries', deliveriesRoutes)
app.use('/api/recipes', recipesRoutes)
app.use('/api/menus', menusRoutes)
app.use('/api/temperature', temperatureRoutes)
app.use('/api/traceability', traceabilityRoutes)
app.use('/api/recurring-outputs', recurringOutputsRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/schedule-events', scheduleEventsRoutes)
app.use('/api/user-profiles', userProfilesRoutes)
app.use('/api/permissions', permissionsRoutes)
app.use('/api/activity-log', activityLogRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/product-lots', productLotsRoutes)
app.use('/api/price-history', priceHistoryRoutes)
app.use('/api/llm', llmRoutes)
app.use('/api/product-mappings', productMappingsRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Route non trouvée' })
})

app.use(errorHandler)

export default app
