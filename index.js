module.exports = SignalingService

var debug = require('debug')('simple-peer')
var inherits = require('inherits')
var http = require('http')
var restify = require('restify')
var EventEmitter = require('events').EventEmitter

inherits(SignalingService, EventEmitter)

function SignalingService (opts) {
  if (!(this instanceof SignalingService)) return new SignalingService(opts)
  EventEmitter.call(this)
  this._peers = {}
  this._server = restify.createServer()
  this._chosen = {}
}

SignalingService.prototype._setHttp = function () {
  this._server.use(restify.bodyParser({mapParams: false}))
  this._server.use(restify.queryParser())
  this._server.use(allowCrossDomain)
  var self = this
  this._server.get('/:peerId/peers_no', function (req, res, next) {
    var peerId = req.params.peerId
    res.contentType = 'application/json'
    var pl = Object.keys(self._peers)
    if (self._peers[peerId]) res.send({'status': -1, txt: 'WARNING: Peer is alredy registered'})
    else {
      self._chosen[peerId] = 0
      self._peers[peerId] = {}
      res.send({'status': 0, payload: pl})
    }
    return next()
  })
  this._server.get('/:peerId/:offer/peer', function (req, res, next) {
    var peerId = req.params.peerId
    var offer = req.params.offer
    self._peers[peerId].offer = offer
    if (Object.keys(self._peers) === 1) res.send({'status': 0, 'peerId': -1})
    else res.send({'status': 0, 'peerId': getInRoundRobin(peerId)})
    return next()
  })
  function allowCrossDomain (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    next()
  }
  function getInRoundRobin (emitter) {
    var j = 0
    for (peerId in self._chosen) {
      if (emitter !== peerId && self._chosen[peerId] === 0) {
        self._chosen[peerId] = 1
        if (j === Object.keys(self._chosen).length - 1) { for (key in self._chosen) self._chosen[key] = 0 }
        return peerId
      }
      j++
    }
  }
}
