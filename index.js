// Init.
const express = require('express');
const http = require("http");
const fs = require("fs");
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
					_socket.emit("newUserSuccess",_name,_pass);
					
					// Inicializa valores default de todas las tablas para la nueva cuenta.
					doQuery("INSERT INTO chapters(name, tale, chapter) VALUES ('"+String(_name)+"',01,01);");
					doQuery("INSERT INTO characters(name, tale, character, gender, color) VALUES ('"+String(_name)+"',01,'"+String(_name)+"','M','0');");
					doQuery("INSERT INTO environments(name, xplayer, yplayer, dirplayer) VALUES ('"+String(_name)+"','200','140','315');");
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
	_socket.on("loadChapter", async (_name,_pass,_tale,_chapter,_character,_gender,_color) => {
		if (isUserValid(_name,_pass))
		{
			// Comprueba el acceso al chapter.
			doQuery("SELECT * FROM chapters WHERE name = '"+String(_name)+"' and tale = "+String(_tale)+" and chapter >= "+String(_chapter)+";", (selChapter) => {
				if (selChapter.rowCount > 0)
				{
					fs.readFile(__dirname + "/tales/t"+String(_tale)+"/t"+String(_tale)+"c"+String(_chapter)+".txt", (_error, _data) => {
						if (_error) throw _error;
						_socket.emit("chapterSuccess",_data.toString().replaceAll("$CHA",_character).replaceAll("$GEN",_gender == "M" ? "o" : "a").replaceAll("$COL",_color));
					});
				}
				else _socket.emit("chapterFail");
			});
		}
	});
	
	// Setear character name.
	_socket.on("setCharacterName", async (_name,_pass,_tale,_character) => {
		if (isUserValid(_name,_pass))
		{
			doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
				if (selCharacter.rowCount > 0)
					doQuery("UPDATE characters SET character = '"+String(_character)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", () => {
						_socket.emit("characterNameChanged",_character);
					});
			});
		}
	});
	
	// Envía el nombre del character y gender.
	_socket.on("demandCharacterData", async (_name,_pass,_tale) => {
		if (isUserValid(_name,_pass))
		{
			doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
				_socket.emit("receiveCharacterData",_tale,selCharacter.rows[0].character,selCharacter.rows[0].gender,selCharacter.rows[0].color);
			});
		}
	});
	
	// Setear el gender.
	_socket.on("setCharacterGender", async (_name,_pass,_tale,_gender) => {
		if (isUserValid(_name,_pass))
		{
			doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
				if (selCharacter.rowCount > 0)
					doQuery("UPDATE characters SET gender = '"+String(_gender)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", () => {
						_socket.emit("characterGenderChanged",_gender);
					});
			});
		}
	});
	
	// Setear el color.
	_socket.on("setCharacterColor", async (_name,_pass,_tale,_color) => {
		if (isUserValid(_name,_pass))
		{
			doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
				if (selCharacter.rowCount > 0)
					doQuery("UPDATE characters SET color = '"+String(_color)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", () => {
						_socket.emit("characterColorChanged",_color);
					});
			});
		}
	});
	
	// El loop para calcular y enviar datos del estado del chapter.
	_socket.on("loop", async (_name,_pass,_currentTale,_currentChapter,_xMouse,_yMouse,_isClick) => {
		if (isUserValid(_name,_pass))
		{
			doQuery("SELECT * FROM environments WHERE name = '"+String(_name)+"';", (selEnvironment) => {
				// El sprite del field.
				var _field = "";
				if (_currentTale == 01 && _currentChapter == 01) _field = "https://i.imgur.com/zkEI0JQ.png";
				
				// La posición del player.
				var _xPlayer = selEnvironment.rows[0].xplayer;
				var _yPlayer = selEnvironment.rows[0].yplayer;
				
				// La dirección del player.
				var _dirPlayer = selEnvironment.rows[0].dirplayer;
				if (_isClick)
				{
					var _dirClick = Math.atan2(_xMouse-_xPlayer,_yMouse-_yPlayer);
					if 		(_dirClick > 000 && _dirClick <= 090) _dirPlayer = 45;
					else if (_dirClick > 090 && _dirClick <= 180) _dirPlayer = 135;
					else if (_dirClick > 180 && _dirClick <= 270) _dirPlayer = 225;
					else if (_dirClick > 270 && _dirClick <= 360) _dirPlayer = 315;
				}
				
				// Actualiza los datos de este frame si has hecho click.
				if (_isClick) doQuery("UPDATE environments SET xPlayer = '"+String(_xPlayer-40)+"', yPlayer = '"+String(_yPlayer-100)+"', dirPlayer = '"+String(_dirPlayer)+"' WHERE name = '"+String(_name)+"';");
				
				// Envía los datos al cliente.
				_socket.emit("looped",_field,_xPlayer,_yPlayer,_dirPlayer);
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
		return true;
	}).catch(e => {
		console.error(e.stack);
		client.release();
		return false;
	});
}

// Si tu usuario es válido...
async function isUserValid(_name,_pass)
{
	doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
		return selUsers.rowCount > 0;
	});
}