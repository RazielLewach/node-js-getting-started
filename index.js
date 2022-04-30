const express = require('express')
const puerto = process.env.PORT || 5000;
const app = express();
const server = app.listen(puerto);
const io = require('socket.io').listen(server);
const path = require('path')
const PORT = process.env.PORT || 5000
const { Pool } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/db', (req, res) => res.render('pages/db'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


io.on('connection', (socket) => {
    socket.on('onRequest', (data) => {
        try {
			console.log("VAMOS!");
			const client = await pool.connect();
			const result = await client.query('SELECT * FROM test_table');
			const results = { 'results': (result) ? result.rows : null};
			console.log("Resultados",results);
			client.release();
		} catch (err) {
			console.error(err);
			res.send("Error " + err);
		}
    });
}