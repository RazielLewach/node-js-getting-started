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
		doQuery("SELECT * FROM users WHERE name = '"+String(name)+"';", (selUsers) => {
			// Caso: cuenta no existe, la crea.
			if (selUsers.rowCount == 0)
			{
				doQuery("INSERT INTO users(name, pass) VALUES ('"+String(name)+"', '"+String(pass)+"');", (ins) => {
					socket.emit("newUserSuccess",name);
				});
			}
			// Caso: cuenta existe.
			else
			{
				console.log("ret",selUsers);
			}
		});
    });
});

// Querys.
async function doQuery(query,func)
{
	const client = await pool.connect();
	const data = await client.query(query).then(res => {
		func(res);
		client.release();
	}).catch(e => {
		console.error(e.stack);
		client.release();
	});
}