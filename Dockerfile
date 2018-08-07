from node:6

workdir /usr/webgc_server

run apt-get update && \
  apt-get install -y --no-install-recommends python

add *.js ./
add package.json ./

expose 8080

run apt-get install nano

run npm install

cmd npm start
