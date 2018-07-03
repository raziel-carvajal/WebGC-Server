from node:1.0.0

workdir /usr/webgc_server

run apt-get update -qq

add *.js .
add package.json .

run npm install

cmd ["npm start"]
