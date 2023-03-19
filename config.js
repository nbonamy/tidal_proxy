
import { readFileSync } from 'fs'
import { parse } from 'yaml'

const FILENAME = 'config.yml'

export default class {

  constructor() {
    this._init()
    this._load()
  }

  _init() {
  }

  _load() {

    try {
      var config = readFileSync(FILENAME, { encoding: 'utf8' })
      Object.assign(this, parse(config))
    } catch (err) {
    }

  }

}
