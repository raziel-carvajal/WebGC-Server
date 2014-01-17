var GossipPeerServer = require('../lib/peerjs-gossip-server.js').GossipPeerServer;
var server = new GossipPeerServer({ port: process.argv[2], debug: true, startExpTimeout: process.argv[3] });
