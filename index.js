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
    socket.on("login", async (name, pass) => {
		try {
			if (doQuery("SELECT * FROM users WHERE name = '"+String(name)+"';"))
			{
				// Caso: cuenta no existe, la crea.
				if (results.length == 0)
				{
					doQuery("INSERT INTO users(name, pass) VALUES ("+String(name)+", "+String(pass)+");");
					socket.emit("newUserSuccess",name);
				}
			}
		} catch (err) {
			console.error(err);
		}
    });
});

// Querys.
async function doQuery(query)
{
	const client = await pool.connect();
	const data = await client.query(query).then(res => {
		client.release();
		return res;
	}).catch(e => {
		console.error(e.stack);
		client.release();
		return false;
	});
}