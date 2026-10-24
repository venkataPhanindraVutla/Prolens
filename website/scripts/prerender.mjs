// Puts the server-rendered page into dist/index.html, then removes the temporary server bundle.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)
const ssr = new URL('../dist-ssr/', import.meta.url)
const { render } = await import(new URL('entry-server.js', ssr).href)
const page = readFileSync(new URL('index.html', dist), 'utf8')
const marker = '<div id="root"></div>'
if (!page.includes(marker)) throw new Error('dist/index.html has no empty #root to fill')
writeFileSync(new URL('index.html', dist), page.replace(marker, `<div id="root">${render()}</div>`))
rmSync(ssr, { recursive: true, force: true })
console.log('pre-rendered dist/index.html')
