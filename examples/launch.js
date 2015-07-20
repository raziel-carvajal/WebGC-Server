var SignalingService = require('../index').SignalingService
var server = new SignalingService({
  port: process.argv[2], 
  debug: true, 
  maxKeepAlives: 3,
  checkForDeadPeers: 5000
});
