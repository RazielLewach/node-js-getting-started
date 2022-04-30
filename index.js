const express = require('express')
const puerto = process.env.PORT || 5000;
const app = express();
const server = app.listen(puerto);
const io = require('socket.io').listen(server);
const path = require('path')
const { Client } = require('pg');
const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});
client.connect();

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/db', (req, res) => res.render('pages/db'))
  .listen(puerto, () => console.log(`Listening on ${ puerto }`))


io.on('connection', (socket) => {
    socket.on('onRequest', (data) => {
		client.query("SELECT * FROM test_table;", (err, res) => {
            if (err) throw err;
            console.log("Resultados",res);
        });
		client.end();
    });
}