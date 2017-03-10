'use strict'

const reekoh = require('reekoh')
const _plugin = new reekoh.plugins.Service()

const request = require('request')
const guid = require('guid')
const isEmpty = require('lodash.isempty')
const isPlainObject = require('lodash.isplainobject')

_plugin.on('data', (data) => {
  if (!isPlainObject(data)) {
    return _plugin.logException(new Error(`Invalid data received. Must be a valid JSON Object. Data: ${data}`))
  }

  if (isEmpty(data) || isEmpty(data.audio) || isEmpty(data.contentType)) {
    return _plugin.logException(new Error('Invalid data received. Data must have base64 encoded audio and contentType fields.'))
  }

  request.post({
    url: _plugin.config.validationUrl,
    form: {
      'grant_type': _plugin.config.grantType,
      'client_id': _plugin.config.clientId,
      'client_secret': _plugin.config.clientSecret,
      'scope': _plugin.config.serviceUrl
    }
  }, (tokenError, tokenResponse, tokenBody) => {
    if (tokenError) {
      console.error(tokenError)
      _plugin.logException(tokenError)
    }
    else if (tokenResponse.statusCode !== 200) {
      console.log(tokenResponse.statusCode)
      _plugin.logException(new Error(`HTTP ${tokenResponse.statusCode}: Error getting token.`))
    }
    else {
      let accessToken = ''

      try {
        accessToken = JSON.parse(tokenBody)['access_token']
      }
      catch (error) {
        return _plugin.logException(new Error('Error getting access token.'))
      }
      request.post({
        url: `${_plugin.config.serviceUrl}/recognize/query`,
        qs: {
          version: _plugin.config.version,
          appID: _plugin.config.appId,
          format: _plugin.config.format,
          'device.os': _plugin.config.deviceOs,
          scenarios: _plugin.config.scenarios,
          locale: _plugin.config.locale,
          requestid: guid.raw(),
          instanceid: guid.raw()
        },
        headers: {
          'Content-Type': data.contentType
        },
        body: new Buffer(data.audio, 'base64'),
        auth: {
          bearer: accessToken
        }
      }, function (speechError, speechResponse, speechBody) {
        if (speechError) {
          _plugin.logException(speechError)
        }
        else if (tokenResponse.statusCode !== 200) {
          _plugin.logException(new Error(`HTTP ${tokenResponse.statusCode}: Error converting speech to text.`))
        }
        else {
          try {
            let result = {
              speechToTextResults: JSON.parse(speechBody).results
            }
            _plugin.pipe(data, JSON.stringify(result))
              .then(() => {
                _plugin.log(JSON.stringify({
                  title: 'Processed data using Speech-to-Text Service',
                  data: data,
                  result: result
                }))
              })
              .catch((err) => {
              _plugin.logException(err)
              })
            console.log(result)
          }
          catch (error) {
            _plugin.logException(error)
          }
        }
      })
    }
  })

})

_plugin.once('ready', () => {

  _plugin.log('Service has been initialized.')
  _plugin.emit('init')
})

module.exports = _plugin
