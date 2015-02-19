var restify = require('restify');
var util = require('../node_modules/peer/lib/util');
var PeerServer = require('../node_modules/peer/lib/server').PeerServer;

function isInArray(x, array){
  if( array.length === 0 )
    return false;
  for(var i = 0; i < array.length; i += 1){
      if( array[i] === x )
        return true;
    }
  return false;
}

function GossipPeerServer(options){
  if( !(this instanceof GossipPeerServer) ) return new GossipPeerServer(options);
  this.plotterPeerId = 'undefined';
  this.profiles = {};
  PeerServer.call(this, options);
}

util.inherits(GossipPeerServer, PeerServer);

GossipPeerServer.prototype._initializeHTTP = function() {
  var self = this;
  
  this._app.use(restify.bodyParser({ mapParams: false }));
  this._app.use(restify.queryParser());
  this._app.use(util.allowCrossDomain);
  
  // Retrieve guaranteed random ID.
  this._app.get('/:key/id', function(req, res, next) {
    console.log('One peer request an ID for the overlay [' + 
      req.params.key + ']');
    res.contentType = 'text/html';
    res.send(self._generateClientId(req.params.key));
    return next();
  });
  
  this._app.get('/:key/:id/view', function(req, res, next){
    console.log('Random view request by [' + req.params.id + ']');
    var key = req.params.key;
    var id = req.params.id;
    var view = self._getIDsRandomly(key, id, self._options.firstViewSize);
    var msg = { view: view };
    msg = JSON.stringify(msg);
    console.log('Response: ' + msg);
    res.contentType = 'text/html';
    res.send(msg);
    return next();
  });
 
  // 
  this._app.post('/profile', function(req, res, next){
    console.log('adding new profile');
    var msg = JSON.parse(req.body);
    if(!self.profiles.hasOwnProperty(msg.id))
      self.profiles[ msg.id ] = {id: msg.id, profile: msg.profile};
    res.send(200);
    return next();
  });

  //
    this._app.get('/getGraph', function(req, res, next){
    console.log('getGraph request received ');
    var keys = Object.keys(self.profiles), result = {};
    for(var i = 0; i < keys.length; i++)
      result[ keys[i] ] = self.profiles[ keys[i] ].profile;
    var answer = JSON.stringify(result);
    console.log('Response of getGraph: ' + answer);
    res.contentType = 'text/html';
    res.send(answer);
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
    if( dstId !== keysArray[j] && this.plotterPeerId !== keysArray[j] ){
      ids[i] = keysArray[j];
      i += 1;
    }
  }
  resultSize = ids.length;
  if( size >= resultSize ) {
    for(var keyId in ids){
      result.push(ids[keyId]);
    }
  } else{
    do{
      rNum = Math.floor(Math.random() * resultSize);
      if( !isInArray(rNum, tmp) ){
        tmp.push(rNum);
        result.push(ids[rNum]);
      }
    }while( result.length != size );
  }
  var r = [];
  for(i = 0; i < result.length; i++){
    if(this.profiles.hasOwnProperty(result[i]))
      r.push(this.profiles[ result[i] ]);
  }
  return r;
};

exports.GossipPeerServer = GossipPeerServer;

