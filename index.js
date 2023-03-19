const Discoverer = require('./discoverer');
const Config = require('./config')
const Tidal = require('./tidal')
const portfinder = require('portfinder')
const mdns = require('mdns')
const uuid = require('uuid')
const ws = require('ws')

const settings = new Config()

const baseName = 'TIDAL Connect Proxy'
const uid = uuid.v4()

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
    if (client.readyState === ws.WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// websocket
portfinder.getPort((err, port) => {

  // start webserver
  wss = new ws.WebSocketServer({ port: port }, () => {

    // success
    console.log(`Websocket opened on port ${port}`)

    // advertise
    const ad = mdns.createAdvertisement(mdns.tcp('tidalconnect'), port, {
      name: `${baseName}-${uid}`,
      txtRecord: {
        fn: settings.name,
        id: uid,
      }
    });
    ad.start();

  })
  wss.on('connection', (ws) => {

    ws.on('error', console.error)

    ws.on('message', (data) => {
      const message = data.toString()
      console.log(`<- ${message}`)
      target?.send(message)
    })

    ws.send(JSON.stringify({}))

  })

})
