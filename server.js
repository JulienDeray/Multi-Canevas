// HTTP server

var express = require('express');
var app = express();

app.listen(3000);

console.log('HTTP server started on port 3000');

serve('/', '/index.html');
serve('/canvas.js');

function serve(path, file) {
	app.get(path, function(req, res) {
		res.sendfile(__dirname + (file || path));
	});
}

// WebSocket server

var WebSocketServer = require('ws').Server;

var ws = new WebSocketServer({port: 8080});

var idClient = 0;

ws.broadcast = function(data, userId) {
    var parsedData = JSON.parse( data );
    parsedData.userId = userId;
    data = JSON.stringify( parsedData );

    for (var c in this.clients)
      this.clients[c].send(data);
};

ws.on('connection', function(socket) {
    socket.id = idClient;
    idClient++;
    console.log("Client n° " + socket.id + " s'est connecté");

    var message = JSON.stringify({ message: 'addCanevas' });
    ws.broadcast(message, socket.id);

    socket.on('message', function(message) {
        ws.broadcast(message, socket.id);
    });
});

console.log('WebSocket server started on port 8080');
