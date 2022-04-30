// Init.
const express = require('express');
const port = process.env.PORT || 5000;

// Sockets.
const app = express();
const http = require('http');
const server = http.createServer(app);
server.listen(port);
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

// Launch and link pages.
express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('index'))
  .get('/db', (req, res) => res.render('db'))
  .listen(port, () => console.log(`Listening on ${ port }`))


// Socket events.
io.on('connection', (socket) => {
    socket.on('onRequest', (data) => {
		client.connect();
		client.query("SELECT * FROM test_table;", (err, res) => {
            if (err) throw err;
            console.log("Resultados",res);
        });
		client.end();
    });
});