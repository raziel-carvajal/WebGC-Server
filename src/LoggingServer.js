var restify = require('restify');
//var colors = require('colors');

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
    console.log(JSON.stringify(req));
    console.log( req.body.data );
    self.printMsg( req.body.data );
    res.send(200);
    return next();
  });
  this.server.listen( this.opts.port );
};

LoggingServer.prototype.printMsg = function(msg){
 // var colorStr;
 // var msgType = msg.substr(1, 5);
 // switch( msgType ){
 //   case 'INFO ':
 //     colorStr = 'blue';
 //     break;
 //   case 'ERROR':
 //     colorStr = 'red';
 //     break;
 //   case 'WARN ':
 //     colorStr = 'yellow';
 //     break;
 //   case 'FATAL':
 //     colorStr = 'red';
 //     break;
 //   default:
 //     console.log('The type of the message is not recognized');
 //     break;
 // }
 // if( colorStr )
 //   console.log( msg[ colorStr ] );
 // else
    console.log( msg );
};

var logger = new LoggingServer( {port: process.argv[2]} );
