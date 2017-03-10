'use strict'

const amqp = require('amqplib')
const fs = require('fs')

let _app = null
let _channel = null
let _conn = null

let conf = {
  clientId: 'reekoh-iot-s2t-test',
  clientSecret: 'ac6e747dd09d494c9f93f6cff9696e6b',
  contentType: 'audio/wav; samplerate=16000',
  version: '3.0',
  appId: 'D4D52672-91D7-4C74-8AD8-42B1D98141A5',
  format: 'json',
  deviceOs: 'Reekoh',
  scenarios: 'ulm',
  locale: 'en-US',
  grantType: 'client_credentials',
  serviceUrl: 'https://speech.platform.bing.com',
  validationUrl: 'https://oxford-speech.cloudapp.net/token/issueToken'
}

describe('Speech to Text Service', function () {
  this.slow(5000)

  before('init', () => {
    process.env.OUTPUT_PIPES = 'Op1,Op2'
    process.env.LOGGERS = 'logger1,logger2'
    process.env.EXCEPTION_LOGGERS = 'exlogger1,exlogger2'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'
    process.env.CONFIG = JSON.stringify(conf)
    process.env.INPUT_PIPE = 'demo.pipe.service'
    process.env.OUTPUT_SCHEME = 'RESULT'
    process.env.OUTPUT_NAMESPACE = 'RESULT'
    process.env.ACCOUNT = 'demo account'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
        _conn = conn
        return conn.createChannel()
      }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate child process', function (done) {
    _conn.close()
    done()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(8000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data', () => {
    it('should process the data and send back a result', function (done) {
      this.timeout(25000)

      fs.readFile('./test/brian.wav', function (err, data) {

        let dummyData = {
          contentType: 'audio/wav; samplerate=16000',
          audio: new Buffer(data).toString('base64')
        }
        _channel.sendToQueue('demo.pipe.service', new Buffer(JSON.stringify(dummyData)))

        setTimeout(done, 20000)
      })
    })
  })
})
