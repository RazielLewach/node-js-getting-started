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
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Rutas para inicializar la ventana
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});
app.get('/aSpaceTrip', (req, res) => {
  res.sendFile(__dirname + '/views/aSpaceTrip.html');
});

server.listen(port, () => {
  console.log('Listening on port');
});

io.on("connection", async (socket) => {
	console.log("User connected");
	
	// Eventos que entran.
    socket.on("login", async (data) => {
		try {
			const client = await pool.connect();
			const users = await client.query("SELECT * FROM users WHERE name = "+String(data.name)+";");
			const results = { 'results': (users) ? users.rows : null};
			//if (results != null)
			//{
				socket.emit("loginSuccess",results);
			//}
			client.release();
		} catch (err) {
			console.error(err);
		}
    });
});