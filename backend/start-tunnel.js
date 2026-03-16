const { execSync } = require('child_process')
const port = process.env.PORT || 3005

const paths = [
  'cloudflared',
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
]

for (const bin of paths) {
  try {
    execSync(`"${bin}" --version`, { stdio: 'ignore' })
    console.log(`Starting tunnel on port ${port}...`)
    const { spawnSync } = require('child_process')
    spawnSync(bin, ['tunnel', '--url', `http://localhost:${port}`], { stdio: 'inherit' })
    process.exit(0)
  } catch {}
}

console.error('cloudflared not found. Install: winget install Cloudflare.cloudflared')
process.exit(1)
