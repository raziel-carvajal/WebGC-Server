var GossipPeerServer = require('./GossipPlotterServer.js').GossipPeerServer;
var server = new GossipPeerServer({
  port: process.argv[2], 
  debug: true, 
  firstViewSize: process.argv[3]
});
