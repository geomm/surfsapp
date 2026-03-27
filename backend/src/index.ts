import express from 'express'
import cors from 'cors'

const app = express()
const port = process.env.PORT ?? 3000

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shut down gracefully')
    process.exit(0)
  })
})
