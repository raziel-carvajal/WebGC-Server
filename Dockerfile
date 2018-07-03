from node:10-stretch

workdir /usr/webgc_server

run apt-get update && \
  apt-get install -y --no-install-recommends python

add *.js ./
add package.json ./

run npm install

cmd npm start
