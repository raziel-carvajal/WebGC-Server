var restify = require('restify');
var colors = require('colors');

var utils = {
  reqSettings: function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  }
};

function LoggingServer(opts){
  this.opts = opts;
  this.server = restify.createServer();
  this.setServerReqs();
}

LoggingServer.prototype.setServerReqs = function(){
  this.server.use( restify.bodyParser({ mapParams: false }) );
  this.server.use( restify.queryParser() );
  this.server.use( utils.reqSettings );
  var self = this;
  
  this.server.post('/log', function(req, res, next){
    console.log( req.params );
    var msg = JSON.parse( req.params );
    console.log(msg);
    self.printMsg( msg );
    return next();
  });
  this.server.listen( this.opts.port );
};

LoggingServer.prototype.printMsg = function(msg){
  var colorStr;
  switch( msg.type ){
    case 'INFO':
      colorStr = 'blue';
      break;
    case 'ERROR':
      colorStr = 'red';
      break;
    case 'WARN':
      colorStr = 'yellow';
      break;
    case 'FATAL':
      colorStr = 'red';
      break;
    default:
      console.log('The type of the message is not recognized');
      break;
  }
  if( colorStr )
    console.log( msg.text[ colorStr ] );
  else
    console.log( msg.text );
};

var logger = new LoggingServer( {port: 9090} );
