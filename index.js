// Init.
const express = require('express');
const port = process.env.PORT || 5000;

// Sockets.
const app = express();
const server = app.listen(port);
const Server = require('socket.io');
const io = new Server(port);

// PostgreSQL.
const path = require('path')
const { Client } = require('pg');
const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

// Template para el engine ejs
app.set('view engine', 'ejs');

// Middlewares
app.use(express.static('public'));

// Rutas para inicializar la ventana
app.get('/', (req, res) => {
    res.render('index');
});
app.get('/db', (req, res) => {
    res.render('db');
});

// Escuchar el puerto adecuado
server.listen(port, function() {
     console.log("La aplicación está ejecutándose en el puerto " + port);
});

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