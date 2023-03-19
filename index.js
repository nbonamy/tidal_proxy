import { createServer } from 'http'
import { createAdvertisement, tcp } from 'mdns'
import { WebSocket, WebSocketServer } from 'ws'
import Discoverer from './discoverer.js'
import Config from './config.js'
import Tidal from './tidal.js'
import { v4 } from 'uuid'

const settings = new Config()

const baseName = 'TIDAL Connect Proxy'
const uid = v4()

let wss = null
let target = null

new Discoverer((device) => {
  if (device.name.includes(uid)) return
  if (device.name.includes(baseName)) return
  if (device.name == target?.name()) return
  if (device.name.includes(settings.target) || device.ip == settings.target) {
    target = new Tidal(settings, device, proxy)
  }
}, (name) => {
  if (name == target?.name()) {
    target.shutdown()
    target = null
  }
})

const proxy = function(message) {
  console.log(`-> ${message}`)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// create server
const server = createServer()
wss = new WebSocketServer({ server })

// our proxy
wss.on('connection', (ws) => {

  ws.on('error', console.error)

  ws.on('message', (data) => {
    const message = data.toString()
    console.log(`<- ${message}`)
    target?.send(message)
  })

  ws.send(JSON.stringify({}))

})

// now start
server.listen(0, () => {

  // success
  console.log(`Websocket opened on port ${server.address().port}`)

  // advertise
  const ad = createAdvertisement(tcp('tidalconnect'), server.address().port, {
    name: `${baseName}-${uid}`,
    txtRecord: {
      fn: settings.name,
      id: uid,
    }
  });
  ad.start();

})
