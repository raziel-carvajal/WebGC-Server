var restify = require('restify');
var PeerServer = require('peer').PeerServer;
var util = require('../node_modules/peer/lib/util.js');

function GossipPeerServer(options){
  if( !(this instanceof GossipPeerServer) ) return new GossipPeerServer(options);
  PeerServer.call(this, options);
  var self = this;
  setInterval(function(){
    var hash = self._clients;
    util.log('Emitting START experiment msg to peers');
    for(overlay in hash){
      var peers = hash[overlay];
      for(peerId in peers){
        var peer = hash[overlay][peerId];
        if(peer.socket){
          peer.socket.send(JSON.stringify({type: 'START'}));
        }
      }
    }
    util.log('\tDONE');
  }, this._options.startExpTimeout);
}

util.inherits(GossipPeerServer, PeerServer);

GossipPeerServer.prototype._initializeHTTP = function() {
  var self = this;

  this._app.use(restify.bodyParser({ mapParams: false }));
  this._app.use(restify.queryParser());
  this._app.use(util.allowCrossDomain);

  // Retrieve guaranteed random ID.
  this._app.get('/:key/id', function(req, res, next) {
    util.log('...GET received...');
    res.contentType = 'text/html';
    res.send(self._generateClientId(req.params.key));
    return next();
  });

  this._app.get('/:key/:id/view', function(req, res, next){
    var key = req.params.key;
    var id = req.params.id;
    var view = self._getIDsRandomly(key, id, 6);
    util.log('Random view :: ' + view);
    res.contentType = 'text/html';
    res.send(JSON.stringify(view));
    return next();
  });

  // Server sets up HTTP streaming when you get post an ID.
  this._app.post('/:key/:id/:token/id', function(req, res, next) {
    var id = req.params.id;
    var token = req.params.token;
    var key = req.params.key;
    var ip = req.connection.remoteAddress;

    if (!self._clients[key] || !self._clients[key][id]) {
      self._checkKey(key, ip, function(err) {
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

  var handle = function(req, res, next) {
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

  this._app.post('/:key/:id/:token/offer', handle);

  this._app.post('/:key/:id/:token/candidate', handle);

  this._app.post('/:key/:id/:token/answer', handle);

  this._app.post('/:key/:id/:token/leave', handle);

  // Listen on user-specified port.
  this._app.listen(this._options.port);
};

/** Get a random view of peer ID's */
GossipPeerServer.prototype._getIDsRandomly = function(key, dstId, size){
  var keysArray = Object.keys(this._clients[key]);
  if( keysArray.length === 0 ){
    return [];
  }
  var i = 0, ids = [], result = [], tmp = [], resultSize;
  for( var j = 0; j < keysArray.length; j += 1){
    if( dstId !== keysArray[j] ){
      ids[i] = keysArray[j];
      i += 1;
    }
  }
  resultSize = ids.length;
  if( size >= resultSize ) {
    return ids;
  } else{
    do{
      rNum = Math.floor(Math.random() * resultSize);
      if( !util.isInArray(rNum, tmp) ){
        tmp.push(rNum);
	result.push(ids[rNum]);
      }
    }while( result.length !== size );
  }
  return result;
};

exports.GossipPeerServer = GossipPeerServer;

