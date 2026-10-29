// Screenshot every screen/step at 1920x1080 and 1366x768, then run the guided tour once.
// Usage: npm run build && npx vite preview --port 4173 (separately), then: node scripts/shoot.mjs [--tour-only]
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173/'
const OUT = fileURLToPath(new URL('../screenshots/', import.meta.url))
const sizes = [[1920, 1080], [1366, 768]]
const errors = []
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ channel: 'msedge' })
async function newPage(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${w}x${h}] console: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`[${w}x${h}] pageerror: ${e.message}`))
  await page.goto(BASE)
  await page.getByText('Start live analysis').waitFor() // React attaches the key listener after first render
  return page
}

if (!process.argv.includes('--tour-only')) {
  for (const [w, h] of sizes) {
    const page = await newPage(w, h)
    let i = 0
    const shot = async (name, ms = 0) => {
      await wait(ms)
      await page.screenshot({ path: `${OUT}${w}x${h}-${String(++i).padStart(2, '0')}-${name}.png` })
    }
    const key = (k) => page.keyboard.press(k)
    await shot('home', 2600)
    await key('ArrowRight'); await shot('analyze-growing', 2000)
    await shot('analyze-verdict', 6500)
    await key('ArrowRight'); await shot('attack-bots-dropping', 2600)
    await shot('attack-fooled', 5500)
    await key('ArrowRight'); await shot('filter-scanning', 1300)
    await shot('filter-result', 3000)
    await key('ArrowRight'); await shot('adv-recrafting', 1600)
    await shot('adv-detected', 3500)
    await key('ArrowRight'); await shot('explain-adv', 1500)
    await page.getByRole('button', { name: 'Attacked', exact: true }).click(); await shot('explain-attacked', 1500)
    const bot = page.locator('main svg circle[fill="#FF4D6D"]').nth(2)
    await bot.hover(); await shot('explain-tooltip', 600)
    await key('ArrowRight'); await shot('results', 3000)
    await key('ArrowRight'); await shot('about', 2000)
    await key('2'); await page.getByRole('button', { name: 'Analyze' }).click(); await shot('analyze-story2-idle', 900)
    await page.close()
  }
}

// guided tour, headless, start to finish
const page = await newPage(1920, 1080)
const t0 = Date.now()
await page.keyboard.press('t')
await page.getByText('Tour complete').waitFor({ timeout: 180000 })
const secs = ((Date.now() - t0) / 1000).toFixed(1)
const onDashboard = await page.getByText('Defenses at 20% smart bots').isVisible()
await page.screenshot({ path: `${OUT}1920x1080-tour-end.png` })
console.log(`tour finished in ${secs}s, ends on dashboard: ${onDashboard}`)
await browser.close()
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors')
