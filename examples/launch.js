var SignalingService = require('../index').SignalingService
var server = new SignalingService({
  port: process.argv[2], 
  debug: true, 
  firstViewSize: process.argv[3],
  maxKeepAlives: 3,
  checkForDeadPeers: 5000
});
