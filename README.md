# ServerJS-Gossip
ServerJS-Gossip is a server in NodeJS that bootstraps an application based on the PeerJS-Gossip library. 
This project depends on the PeerServer project, the aim of PeerServer is to offer a broker for connections
with WebRTC. To broke connections with PeerServer means, in general, to bootstap connections between
nodes that runs on the top of WebRTC.

## Installation Instructions
Be sure that NodeJS, Git and NPM are installed in your machine. Then follow the next steps:
- Fork the project ServerJS-Gossip through the next command: ``` git clone               
  git+ssh://<user>@scm.gforge.inria.fr//gitroot/serverjs-gossip/serverjs-gossip.git  ```
  the ``` <user> ``` tag must be replaced with your user's name.
- Go to the folder ``` serverjs-gossip``` with the command ``` cd serverjs-gossip ``` 
- Type the command ``` npm install ```

Nowadays this project does not contain examples for showing how to use this server, besides, the 
PeerJS-Gossip project depends of this server. So, the PeerJS-Gossip project considers ServerJS-Gossip in
its use cases. Refer to the PeerJS-Gossip project in order to understand how ServerJS-Gossip is used.
