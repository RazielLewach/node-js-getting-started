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

server.listen(port, () => {
  console.log('Listening on port');
});

io.on("connection", async (_socket) => {
	console.log("User connected");
	
	// Eventos que entran.
	// Login o crear usuario.
    _socket.on("login", async (_name,_pass) => {
		doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"';", (selUsers) => {
			// Caso: cuenta no existe, la crea.
			if (selUsers.rowCount == 0)
			{
				doQuery("INSERT INTO users(name, pass) VALUES ('"+String(_name)+"', '"+String(_pass)+"');", () => {
					doQuery("INSERT INTO chapters(name, tale, chapter) VALUES ('"+String(_name)+"',01,01);");
					_socket.emit("newUserSuccess",_name,_pass);
				});
			}
			// Caso: cuenta existe.
			else
			{
				// Contraseña correcta.
				if (selUsers.rows[0].pass == _pass) _socket.emit("newUserSuccess",_name,_pass);
				// Contraseña incorrecta.
				else _socket.emit("newUserFail");
			}
		});
    });
	
	// Comprobar si el usuario tiene acceso al chapter de la tale y enviar el contenido.
	_socket.on("loadChapter", async (_name,_pass,_tale,_chapter) => {
		if (isUserValid(_name,_pass))
		{
			// Comprueba el acceso al chapter.
			doQuery("SELECT * FROM chapters WHERE name = '"+String(_name)+"' and tale = "+String(_tale)+" and chapter >= "+String(_chapter)+";", (selChapter) => {
				if (selChapter.rowCount > 0) _socket.emit("chapterSuccess",getChapterText(_tale,_chapter));
				else _socket.emit("chapterFail");
			});
		}
	});
	
	// Setear character name.
	_socket.on("setCharacterName", async (_name,_pass,_character) => {
		if (isUserValid(_name,_pass))
		{
			doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"';", (selCharacter) => {
				// Si el nombre no existe, lo añade.
				if (selCharacter.rowCount == 0)
					doQuery("INSERT INTO characters(name, character) VALUES ('"+String(_name)+"', '"+String(_character)+"');", () => {
						_socket.emit("characterNameChanged",_character);
					});
				// Si existe, lo actualiza.
				else
					doQuery("UPDATE characters SET character = '"+String(_character)+"' WHERE name = '"+String(_name)+"';", () => {
						_socket.emit("characterNameChanged",_character);
					});
			});
		}
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

// Si tu usuario es válido...
function isUserValid(_name,_pass)
{
	doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
		return selUsers.rowCount > 0;
	}
}

// Contenido de los chapters.
function getChapterText(_tale,_chapter)
{
	if (_tale == 1 && _chapter == 1) return "PEDAZO CHAPTER 1 QUE TENEMOS AQUI";
	else return "Chapter failed to load!";
}