import 'dotenv/config'
import app from './src/app'

app.listen(3002, () => {
  console.log('Test on 3002')
  fetch('http://localhost:3002/api/llm/status').then(r => r.text()).then(t => {
    console.log('Result:', t)
    process.exit(0)
  })
})
