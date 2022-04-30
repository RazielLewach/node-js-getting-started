// Init.
const express = require('express');
const port = process.env.PORT || 5000;

// Sockets.
const app = express();
const http = require('http');
const socket = require("socket.io");
//const server = http.createServer(app);
//const { Server } = socket;
//const io = new Server(server);

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
var server = http.createServer(app).listen(port, function(){
  console.log("Express server listening on port " + port);
});

var io = socket.listen(server);

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