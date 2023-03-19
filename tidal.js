const WebSocket = require('ws')

const CONNECT_RETRY_DELAY = 5000

module.exports = class {

  constructor(settings, device, callback) {
    this._settings = settings
    this._device = device
    this._callback = callback
    this._connect()
  }

  name() {
    return this._device.name
  }

  shutdown() {
    try {
      console.log(`Websocket disconnected from ${this._device.name}`)
      clearInterval(this._heartbeat)
      this._ws.close()
    } catch {}
  }

  send(message) {

    // override user id if needed
    if (message.includes('startSession')) {
      let payload = JSON.parse(message)
      payload.sessionCredential = this._settings.tidal.user_id.toString()
      message = JSON.stringify(payload)
    }

    // now send
    this._ws.send(message)
  
  }

  _connect() {

    // clear
    clearTimeout(this._retryTimer)
    this._retryTimer =  null

    // open our websocket
    this._ws = new WebSocket(`wss://${this._device.ip}:${this._device.port}`, {
      rejectUnauthorized: false
    })
    this._ws.on('open', () => {
      console.log(`Websocket connected to TIDAL ${this._device.name}`)
    });
    this._ws.on('message', (message) => {
      this._process_mg(JSON.parse(message.toString()))
    })

    // and ping
    this._heartbeat = setInterval(() => {
      try {
        this._ws.ping()
      } catch {}
    }, 1000)
  }

  _process_mg(message) {
    if (message.command == 'notifySessionError') {
      console.log(`Unsuccessful connection. Retrying in ${CONNECT_RETRY_DELAY} ms.`)
      this._retryTimer = setTimeout(() => {
        this._connect()
      }, CONNECT_RETRY_DELAY)
    } else if (message.command == 'notifySessionEnded') {
      this.shutdown()
      this._connect()
    }

    // notify
    this._callback?.(JSON.stringify(message))
  }

}
