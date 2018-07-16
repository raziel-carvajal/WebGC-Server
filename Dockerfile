from node:6

workdir /usr/webgc_server

run apt-get update && \
  apt-get install -y --no-install-recommends python

add *.js ./
add package.json ./

run npm install

cmd npm start
