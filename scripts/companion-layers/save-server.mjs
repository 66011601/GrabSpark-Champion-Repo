// Receives the layers (scripts/companion-layers/build.html) and the full-body poses (scripts/companion-poses/build.html)
// and writes them to public/images/companion/. Stop it with Ctrl+C.
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const NAMES = /^(?:companion-(?:body|head|handL|handR)|poses\/(?:wave|hips|cheer|heart|bag|peace))\.webp$/

createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'POST')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  const name = new URL(request.url, 'http://localhost').searchParams.get('name') ?? ''
  if (request.method !== 'POST' || !NAMES.test(name)) return response.writeHead(request.method === 'OPTIONS' ? 204 : 400).end()
  const chunks = []
  request.on('data', (chunk) => chunks.push(chunk))
  request.on('end', () => {
    writeFileSync(new URL(`../../public/images/companion/${name}`, import.meta.url), Buffer.concat(chunks))
    console.log('saved', name)
    response.writeHead(200).end()
  })
}).listen(5199, () => console.log('waiting for layers on http://localhost:5199'))
