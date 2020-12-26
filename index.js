const fs = require('fs');
var app = require('express')();
var http = require('http');
var server = http.createServer(app);

var WebSocket = require('ws');
var wss = new WebSocket.Server({ server });

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

wss.on('connection', function(socket) {
  console.log('a user connected');
  if (socket.readyState === WebSocket.OPEN) {
    const protocol = socket.protocol;
    const path = './data' + protocol.replace(/_/g, '/');
    const dbPath = path + 'db.json';

    if (!fs.existsSync(path)) {
      // Create dir
      fs.mkdirSync(path, { recursive: true });
    }
    let reset = false;
    if (!fs.existsSync(dbPath)) {
      reset = true; 
    }
    const adapter = new FileSync(dbPath);
    const db = low(adapter);
    if (reset) {
      // Set some defaults
      db.defaults({ log: [] })
      .write();
    }
    const messages = db.get('log')
                   .map('msg')
                   .value();
    messages.forEach(message => {
      socket.send(message);
    });
  }
  socket.on("message", function(message) {
    const protocol = socket.protocol;
    const path = './data' + protocol.replace(/_/g, '/');
    const dbPath = path + 'db.json';

    const adapter = new FileSync(dbPath);
    const db = low(adapter);
    const _ = db._;

    const size = db.get('log')
                   .size()
                   .value();
    if (size === 100) {
      db.get('log')
        .pullAt([0])
        .write();
    }
    db.get('log')
      .push({ msg: message })
      .write();
    wss.clients.forEach(function(client) {
      if (client.protocol === socket.protocol && client !== socket && client.readyState === WebSocket.OPEN ) {
        client.send(message);
      }
    });
  });
  socket.on('close', function() {
    console.log('user disconnected');
  });
});

server.listen(62187, function() {
  console.log('listening on *:62187');
});
