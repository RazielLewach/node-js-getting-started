// Init.
const express = require('express');
const port = process.env.PORT || 5000;

// Sockets.
/*const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);*/
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// PostgreSQL.
const path = require('path')
const { Client } = require('pg');
const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

// Launch and link pages.
app
  .use(express.static('public'))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('index'))
  .get('/db', (req, res) => res.render('db'))
  .listen(port, () => console.log(`Listening on ${ port }`))


// Escuchar el puerto adecuado
server.listen(port, function() {
     console.log("Tomato server running on port " + port);
});

// Socket events.
io.on('connection', (socket) => {
    socket.on('onRequest', (data) => {
		console.log("Tomato user connected");
		client.connect();
		client.query("SELECT * FROM test_table;", (err, res) => {
            if (err) throw err;
            console.log("Resultados",res);
        });
		client.end();
    });
});