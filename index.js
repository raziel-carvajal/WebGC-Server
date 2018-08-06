var debug = require('debug')('signaling-service')
var restify = require('restify')
var inherits = require('util').inherits
// const PeerServer = require('peer').PeerServer.super_.init
const PeerServer = require('peer').PeerServer

function SignalingService(options) {
  if (!(this instanceof SignalingService)) return new SignalingService(options)
  PeerServer.call(this, options)
  this._initializeHTTP();
  this._key = options.key
  this._chosen = {}
  this.keepAlives = {}
  this.maxKeepAlives = options.maxKeepAlives
  this.checkForDeadPeers = options.checkForDeadPeers
  var self = this
  setInterval(function () { self.removeDeadPeers() }, this.checkForDeadPeers)
  debug('SignalingService.init')
}

debug('hinherits')
inherits(SignalingService, PeerServer)
// TODO The only way to attach the Gossip HTTP request in this server was to
// overwrite this method. Is it possible to add HTTP GETs/POSTs once the
// restify server listens ?
SignalingService.prototype._initializeHTTP = function() {
  // PeerServer code STARTS ////////////////////////////////////////////////////////
  function allowCrossDomain (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
    debug('Content of Request' + req)
    debug('Content of Response' + res)
    
  }
  var self = this;
  this._app.use(restify.bodyParser({ mapParams: false }));
  this._app.use(restify.queryParser());
  this._app.use(allowCrossDomain);
  // Retrieve guaranteed random ID.

  this._app.get('/:key/id', function (req, res, next) {
    debug('ID-GEN')
    res.contentType = 'text/html';
    res.send(self._generateClientId(req.params.key));
    return next();
  });
  // Server sets up HTTP streaming when you get post an ID.
  // Ici il faut debugger pour voir ce qui se passe quand le client demande un ID
  
  this._app.post('/:key/:id/:token/id', function (req, res, next) {
    var id = req.params.id;
    var token = req.params.token;
    var key = req.params.key;
    var ip = req.connection.remoteAddress;
    if (!self._clients[key] || !self._clients[key][id]) {
      self._checkKey(key, ip, function (err) {
        if (!err && !self._clients[key][id]) {
          self._clients[key][id] = { token: token, ip: ip };
          self._ips[ip]++;
          self._startStreaming(res, key, id, token, true);
        } else {
          res.send(JSON.stringify({ type: 'HTTP-ERROR' }));
        }
      });
    } else {
      self._startStreaming(res, key, id, token);
    }
    return next();
  });
  var handle = function (req, res, next) {
    var key = req.params.key;
    var id = req.params.id;
    var client;
    if (!self._clients[key] || !(client = self._clients[key][id])) {
      if (req.params.retry) {
        res.send(401);
      } else {
        // Retry this request
        req.params.retry = true;
        setTimeout(handle, 25, req, res);
      }
      return;
    }
    // Auth the req
    if (req.params.token !== client.token) {
      res.send(401);
      return;
    } else {
      self._handleTransmission(key, {
        type: req.body.type,
        src: id,
        dst: req.body.dst,
        payload: req.body.payload
      });
      res.send(200);
    }
    return next();
  };
  // PeerServer code ENDS ////////////////////////////////////////////////////////
  // SingnalingService code STARTS////////////////////////////////////////////////
  this._app.get('/:key/:id/peerToBoot', function (req, res, next) {
    debug('peerToBoot')
    var id = req.params.id
    var key = req.params.key
    var peer = 'undefined'
    var peerProfile = 'undefined'
    debug('PeerId: ' + id)
    res.contentType = 'text/html'
    if (self._clients[key]) {
      if (self._clients[key][id]) {
        self._chosen[id] = 0
        if (Object.keys(self._clients[key]).length > 0) peer = self._getInRoundRobin(id)
        var answ = {'peer': peer}
        var answTxt = JSON.stringify(answ)
        debug('For ' + id + ' the next peer to boot was chosen ' + peer + ' with answer: ' + answTxt)
        res.send(answTxt)
      } else {
        res.send(JSON.stringify({
          type: 'HTTP-ERROR',
          msg: 'How ' + id + ' get access without the socket connection ?'
        }))
      }
    } else {
      res.send(JSON.stringify({ type: 'HTTP-ERROR', msg: 'No peers for key ' + key }))
    }
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
    debug('getGraph request received ');
    var keys = Object.keys(self.keepAlives);
    var result = []
    for (var i = 0; i < keys.length; i++) result.push(keys[i])
    var answer = JSON.stringify(result)
    debug('Response of getGraph: ' + answer)
    res.contentType = 'text/html'
    res.send(answer)
    return next()
  })
  this._app.post('/checkPeerId', function (req, res, next) {
  	debug("checkPeerId")
    var msg = JSON.parse(req.body)
    debug("DONe!")
    var registered = self._chosen.hasOwnProperty(msg.id) ? true : false
    var answer = JSON.stringify({'answer': registered})
    res.contentType = 'text/html'
    res.send(answer)
    return next()
  })
  // SignalingService code ENDS
  // PeerServer code STARTS
  this._app.post('/:key/:id/:token/offer', handle);
  this._app.post('/:key/:id/:token/candidate', handle);
  this._app.post('/:key/:id/:token/answer', handle);
  this._app.post('/:key/:id/:token/leave', handle);
  // Listen on user-specified port.
  this._app.listen(this._options.port)
  // PeerServer code ENDS
};
SignalingService.prototype._getInRoundRobin = function (emitter) {
  var j = 0
  for (peerId in this._chosen) {
    //if (emitter !== peerId && this._chosen[peerId] === 0) {
    if (emitter !== peerId) {
      return peerId
      //this._chosen[peerId] = 1
      //if (j === Object.keys(this._chosen).length - 1) { for (key in this._chosen) this._chosen[key] = 0 }
      //return peerId
    }
    j++
  }
}
SignalingService.prototype.removeDeadPeers = function () {
  var keys = Object.keys(this.keepAlives)
  for (var i = 0; i < keys.length; i++) {
    this.keepAlives[ keys[i] ]++
    if (this.keepAlives[ keys[i] ] >= this.maxKeepAlives) {
      delete this.keepAlives[ keys[i] ]
      delete this._chosen[ keys[i] ]
      delete this._clients[this._key][ keys[i] ]
    }
  }
}

exports.SignalingService = SignalingService
