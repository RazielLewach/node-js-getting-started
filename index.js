// Init.
const express = require('express');
const http = require("http");
const port = process.env.PORT || 5000;

// Sockets.
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// PostgreSQL.
const path = require('path')
const { Client } = require('pg');
const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

// Rutas para inicializar la ventana
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

server.listen(port, () => {
  console.log('listening on port');
});

io.on("connection", (socket) => {
	console.log("a user connected");
    socket.on("onRequest", (data) => {
		console.log("EXITO server");
		client.connect();
		client.query("SELECT * FROM test_table;", (err, res) => {
            if (err) throw err;
			socket.emit("exito",res);
        });
		client.end();
    });
});