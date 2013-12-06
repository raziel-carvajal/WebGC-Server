var GossipPeerServer = require('../lib/peerjs-gossip-server.js').GossipPeerServer;
var server = new GossipPeerServer({ port: 9000, debug: true, startExpTimeout: 15000 });
