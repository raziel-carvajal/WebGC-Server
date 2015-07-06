// var debug = require('debug')('signaling-service')
// var inherits = require('inherits')
// var http = require('http')
// var restify = require('restify')
// var EventEmitter = require('events').EventEmitter
// 
// inherits(SignalingService, EventEmitter)
// 
// function SignalingService (opts) {
//   if (!(this instanceof SignalingService)) return new SignalingService(opts)
//   EventEmitter.call(this)
//   this._peers = {}
//   this._server = restify.createServer()
//   this._chosen = {}
// }
// 
// SignalingService.prototype._setHttp = function () {
//   this._server.use(restify.bodyParser({mapParams: false}))
//   this._server.use(restify.queryParser())
//   this._server.use(allowCrossDomain)
//   var self = this
//   this._server.get('/:peerId/peers_no', function (req, res, next) {
//     var peerId = req.params.peerId
//     res.contentType = 'application/json'
//     var pl = Object.keys(self._peers)
//     if (self._peers[peerId]) res.send({'status': -1, txt: 'WARNING: Peer is alredy registered'})
//     else {
//       self._chosen[peerId] = 0
//       self._peers[peerId] = {}
//       res.send({'status': 0, payload: pl})
//     }
//     return next()
//   })
//   this._server.get('/:peerId/:offer/peer', function (req, res, next) {
//     var peerId = req.params.peerId
//     var offer = req.params.offer
//     self._peers[peerId].offer = offer
//     if (Object.keys(self._peers) === 1) res.send({'status': 0, 'peerId': -1})
//     else res.send({'status': 0, 'peerId': getInRoundRobin(peerId)})
//     return next()
//   })
//   function allowCrossDomain (req, res, next) {
//     res.setHeader('Access-Control-Allow-Origin', '*')
//     res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
//     next()
//   }
//   function getInRoundRobin (emitter) {
//     var j = 0
//     for (peerId in self._chosen) {
//       if (emitter !== peerId && self._chosen[peerId] === 0) {
//         self._chosen[peerId] = 1
//         if (j === Object.keys(self._chosen).length - 1) { for (key in self._chosen) self._chosen[key] = 0 }
//         return peerId
//       }
//       j++
//     }
//   }
// }

exports.SignalingService = SignalingService

var debug = require('debug')('signaling-service')
var restify = require('restify')
var inherits = require('inherits')
var PeerServer = require('peer').PeerServer

inherits(SignalingService, PeerServer)

function SignalingService(options){
  if (!(this instanceof SignalingService)) return new SignalingService(options)
  PeerServer.call(this, options)
  this.recRank = 0
  this.orderDone = false
  this.clientsWithRank = []
  this.clientsRank = {}
  this.profiles = {}
  this.keepAlives = {}
  this.maxKeepAlives = options.maxKeepAlives
  this.checkForDeadPeers = options.checkForDeadPeers
  var self = this
  setInterval(function () {
    self.removeDeadPeers()
  }, this.checkForDeadPeers)
}

// TODO The only way to attach the Gossip HTTP request in this server was to
// overwrite this method. Is it possible to add HTTP GETs/POSTs once the
// restify server listens ?
SignalingService.prototype._initializeHTTP = function() {
  // this function belogs to PeerServer in its "util" object
  function allowCrossDomain (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    next()
  }
  this._app.use(restify.bodyParser({ mapParams: false }))
  this._app.use(restify.queryParser())
  this._app.use(allowCrossDomain)
  var self = this 
  // Retrieve guaranteed random ID.
  this._app.get('/:key/id', function (req, res, next) {
    debug('One peer request an ID for the overlay [' + req.params.key + ']')
    res.contentType = 'text/html'
    res.send(self._generateClientId(req.params.key))
    return next()
  })
  // This post was altered
  // Server sets up HTTP streaming when you get post an ID.
  this._app.post('/:key/:id/:token/id', function (req, res, next) {
    var id = req.params.id
    var token = req.params.token
    var key = req.params.key
    var ip = req.connection.remoteAddress
    if (!self._clients[key] || !self._clients[key][id]) {
      self._checkKey(key, ip, function (err) {
        if (!err && !self._clients[key][id]) {
          self.clientsRank[id] = self.recRank
          self.clientsWithRank.push({'id': id, 'rank': self.recRank})
          self.recRank++
          self._clients[key][id] = { token: token, ip: ip }
          self._ips[ip]++
          self._startStreaming(res, key, id, token, true)
        } else {
          res.send(JSON.stringify({ type: 'HTTP-ERROR' }))
        }
      })
    } else {
      self._startStreaming(res, key, id, token)
    }
    return next()
  })
  var handle = function (req, res, next) {
    var key = req.params.key
    var id = req.params.id
    var client
    if (!self._clients[key] || !(client = self._clients[key][id])) {
      if (req.params.retry) {
        res.send(401)
      } else {
        // Retry this request
        req.params.retry = true
        setTimeout(handle, 25, req, res)
      }
      return
    }
    // Auth the req
    if (req.params.token !== client.token) {
      res.send(401)
      return
    } else {
      self._handleTransmission(key, {
        type: req.body.type,
        src: id,
        dst: req.body.dst,
        payload: req.body.payload
      })
      res.send(200)
    }
    return next()
  }
  // FUNCTIONS OF SignalingService
  this._app.get('/:id/neighbour', function (req, res, next) {
    var id = req.params.id
    if (!self.orderDone) {
      self.clientsWithRank.sort(function (a,b) { return a.rank - b.rank })
      debug('Clients in order: ')
      debug(self.clientsWithRank)
      self.orderDone = true
    }
    var indx = self.clientsRank[id]
    var neigh = 'void'
    if (indx !== 0 && indx < self.clientsWithRank.length - 1) neigh = self.clientsWithRank[indx + 1].id
    else if (indx === 0) neigh = self.clientsWithRank[1].id
    res.contentType = 'text/html'
    debug('Neighbour of: ' + id + " is: " + neigh)
    var msg = JSON.stringify({'neighbour': neigh})
    res.send(msg)
    return next()
  })
  this._app.get('/:key/:id/view', function (req, res, next) {
    debug('Random view request by [' + req.params.id + ']')
    var key = req.params.key
    var id = req.params.id
    var view = self._getIDsRandomly(key, id, self._options.firstViewSize)
    var msg = { view: view }
    msg = JSON.stringify(msg)
    debug('Response: ' + msg)
    res.contentType = 'text/html'
    res.send(msg)
    return next()
  }) 
  this._app.post('/profile', function (req, res, next) {
    debug('adding new profile')
    var msg = JSON.parse(req.body)
    if (!self.profiles.hasOwnProperty(msg.id) ) {
      self.profiles[ msg.id ] = {id: msg.id, profile: msg.profile}
    }
    var answer = JSON.stringify({success: true})
    res.contentType = 'text/html'
    res.send(answer)
    return next()
  })
  this._app.post('/keepAlive', function (req, res, next) {
    var msg = JSON.parse(req.body)
    self.keepAlives[msg.id] = 0
    var answer = JSON.stringify({success: true})
    res.contentType = 'text/html'
    res.send(answer)
    return next()
  })
  this._app.get('/getGraph', function (req, res, next) {
    debug('getGraph request received ')
    var keys = Object.keys(self.profiles)
    var result = {}
    for (var i = 0; i < keys.length; i++) result[ keys[i] ] = self.profiles[ keys[i] ].profile
    var answer = JSON.stringify(result)
    debug('Response of getGraph: ' + answer)
    res.contentType = 'text/html'
    res.send(answer)
    return next()
  })
  this._app.post('/checkPeerId', function (req, res, next) {
    var msg = JSON.parse(req.body)
    var registered = self.clientsRank.hasOwnProperty(msg.id) ? true : false
    var answer = JSON.stringify({'answer': registered})
    res.contentType = 'text/html'
    res.send(answer)
    return next()
  })
  this._app.post('/:key/:id/:token/offer', handle)
  this._app.post('/:key/:id/:token/candidate', handle)
  this._app.post('/:key/:id/:token/answer', handle)
  this._app.post('/:key/:id/:token/leave', handle)
  // Listen on user-specified port.
  this._app.listen(this._options.port)
}
/** Get a random view of peer ID's */
SignalingService.prototype._getIDsRandomly = function (key, dstId, size) {
  var keysArray = Object.keys(this._clients[key])
  if( keysArray.length === 0 ) return []
  var i = 0
  var ids = []
  var result = []
  var tmp = []
  var resultSize
  for (var j = 0; j < keysArray.length; j++){
    if (dstId !== keysArray[j]) {
      ids[i] = keysArray[j]
      i += 1
    }
  }
  resultSize = ids.length
  if (size >= resultSize) {
    for(var keyId in ids) result.push(ids[keyId])
  } else {
    do {
      rNum = Math.floor(Math.random() * resultSize)
      // rNum NOT IN tmp ?
      if (tmp.indexOf(rNum, 0) < 0){
        tmp.push(rNum)
        result.push(ids[rNum])
      }
    } while (result.length != size)
  }
  var r = []
  for (i = 0; i < result.length; i++){
    if (this.profiles.hasOwnProperty(result[i])) r.push(this.profiles[ result[i] ])
  }
  return r
}
SignalingService.prototype.removeDeadPeers = function () {
  var deadPeers = []
  var  i
  for (i = 0, keys = Object.keys(this.keepAlives); i < keys.length; i++) {
    this.keepAlives[ keys[i] ]++
    if (this.keepAlives[ keys[i] ] >= this.maxKeepAlives) deadPeers.push(keys[i])
  }
  for (i = 0; i < deadPeers.length; i++) {
    if (this.profiles.hasOwnProperty(deadPeers[i])) {
      delete this.profiles[deadPeers[i]]
      delete this.keepAlives[deadPeers[i]]
    }
  }
}
