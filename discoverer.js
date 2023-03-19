
const mdns = require('mdns')

module.exports = class {

  constructor(cbUp, cbDown) {
    //this.ip = this._ipv4()
    this.cbUp = cbUp
    this.cbDown = cbDown
    this._discover()
  }

  _discover() {
    this._discover_by_type('tidal', 'tidalconnect')
  }

  _discover_by_type(device_type, service_type) {

    // getaddr fails: https://stackoverflow.com/questions/29589543/raspberry-pi-mdns-getaddrinfo-3008-error
    const browser = mdns.createBrowser(mdns.tcp(service_type), { resolverSequence: [
      mdns.rst.DNSServiceResolve(),
      'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families:[4]}),
      mdns.rst.makeAddressesUnique()
    ]});
    browser.on('error', error => {
      console.log(error)
    })

    // now real handler
    browser.on('serviceUp', service => {
      for (let service_ip of service.addresses) {
        if (this.ip == null || service_ip == this.ip) {
          //console.log(`Device found ${service.name}: ${service.host}:${service.port}`)
          this.cbUp({
            name: service.name,
            type: device_type,
            ip: service_ip,
            host: service.host,
            port: service.port,
          })
        }
      }
    });
    browser.on('serviceDown', service => {
      //console.log(`Device lost ${service.name}`)
      this.cbDown(service.name)
    })
    browser.start()
  }

  _ipv4() {

    // get the ip
    var interfaces = require('os').networkInterfaces()
    var addresses = []
    for (var k in interfaces) {
      for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2]
        if (address.family == 'IPv4' && !address.internal) {
          addresses.push(address.address)
        }
      }
    }

    // check
    if (addresses.length === 0) {
      console.error('No IP address found. Exiting.')
      process.exit()
    }

    // save it
    return addresses[0]    
  }

}
