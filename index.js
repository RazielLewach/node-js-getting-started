//{ ####################################################### Inicializaciones. #######################################################
	// Init.
	var express = require('express');
	var http = require("http");
	var fs = require("fs");
	var port = process.env.PORT || 5000;

	// Sockets.
	var app = express();
	var server = http.createServer(app);
	var { Server } = require("socket.io");
	var io = new Server(server);

	// PostgreSQL.
	var { Pool } = require('pg');
	var pool = new Pool({
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
//}
io.on("connection", async (_socket) => {
	//{ ####################################################### Login o crear usuario. #######################################################
		console.log("User connected");
		_socket.on("login", async (_name,_pass) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"';", (selUsers) => {
				// Caso: cuenta no existe, la crea.
				if (selUsers.rowCount == 0)
				{
					doQuery("INSERT INTO users(name, pass, taleplaying, chapterplaying) VALUES ('"+String(_name)+"', '"+String(_pass)+"', '00', '00');", () => {
						_socket.emit("newUserSuccess",_name,_pass);
						
						// Inicializa valores default de todas las tablas generales para la nueva cuenta. No afecta a las tablas por cada tale-chapter, eso va a parte cuando abres el capítulo por primera vez.
						doQuery("INSERT INTO chapters(name, tale, chapter) VALUES ('"+String(_name)+"',01,01);");
						doQuery("INSERT INTO characters(name, tale, character, gender, color) VALUES ('"+String(_name)+"',01,'"+String(_name)+"','M','0');");
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
	//}
	//{ ####################################################### Comprobar si el usuario tiene acceso al chapter de la tale y enviar el contenido (async). #######################################################
		_socket.on("loadChapter", async (_name,_pass,_tale,_chapter,_character,_gender,_color) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					// Comprueba el acceso al chapter.
					doQuery("SELECT * FROM chapters WHERE name = '"+String(_name)+"' and tale = "+String(_tale)+" and chapter >= "+String(_chapter)+";", (selChapter) => {
						if (selChapter.rowCount > 0)
						{
							// Si tiene acceso al chapter, carga su contenido en texto...
							fs.readFile(__dirname + "/tales/t"+String(_tale)+"/t"+String(_tale)+"c"+String(_chapter)+".txt", (_error, _data) => {
								if (_error) throw _error;
								_socket.emit("chapterSuccess",_data.toString().replaceAll("$CHA",_character).replaceAll("$GEN",_gender == "M" ? "o" : "a").replaceAll("$COL",_color));
							});
							
							// ... y posteriormente accede a BD para ver si inicializar los datos del chapter si no existen o si estabas con otro anterior.
							// Si no estás viendo ningún chapter, o es distinto al que has seleccionado, inicializa los datos de ese chapter y tale. En caso contrario no hará nada: los datos ya son válidos y "carga partida".
							if ((selUsers.rows[0].taleplaying == '00' && selUsers.rows[0].chapterplaying == '00') || (selUsers.rows[0].taleplaying != _tale && selUsers.rows[0].chapterplaying != _chapter))
							{
								// Actualiza qué tale y chapter estás leyendo.
								doQuery("UPDATE users set taleplaying = '"+String(_tale)+"', chapterplaying = '"+String(_chapter)+"' WHERE name = '"+String(_name)+"';");
								
								// Limpia el entorno y todos los datos.
								doQuery("DELETE FROM player01 where name = '"+String(_name)+"';");
								doQuery("DELETE FROM enemies01 where name = '"+String(_name)+"';");
								
								// Crea el entorno según el tale y chapter.
								// HUMANO, SANGRE Y PETRÓLEO.
								if (_tale == "01" && _chapter == "01") // Primera batalla contra el tipo con pala por haber matado a su amigo en el hielo.
								{
									doQuery("INSERT INTO player01(name,xplayer,yplayer,dirplayer,spriteplayer,stunplayer) VALUES ('"+String(_name)+"','0','0','0','Still','0');");
									doQuery("INSERT INTO enemies01(name,nameenemy,xenemy,yenemy,direnemy,spriteenemy,stunenemy) VALUES ('"+String(_name)+"','Explorador','10000','0','180','Chase','10');");
								}
							}
						}
						else _socket.emit("chapterFail");
					});
				}
			});
		});
	//}
	//{ ####################################################### Setear character name. #######################################################
		_socket.on("setCharacterName", async (_name,_pass,_tale,_character) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
						if (selCharacter.rowCount > 0)
							doQuery("UPDATE characters SET character = '"+String(_character)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", () => {
								_socket.emit("characterNameChanged",_character);
							});
					});
				}
			});
		});
	//}
	//{ ####################################################### Envía el nombre del character y gender. #######################################################
		_socket.on("demandCharacterData", async (_name,_pass,_tale) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
						_socket.emit("receiveCharacterData",_tale,selCharacter.rows[0].character,selCharacter.rows[0].gender,selCharacter.rows[0].color);
					});
				}
			});
		});
	//}
	//{ ####################################################### Setear el gender. #######################################################
		_socket.on("setCharacterGender", async (_name,_pass,_tale,_gender) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
						if (selCharacter.rowCount > 0)
							doQuery("UPDATE characters SET gender = '"+String(_gender)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", () => {
								_socket.emit("characterGenderChanged",_gender);
							});
					});
				}
			});
		});
	//}
	//{ ####################################################### Setear el color. #######################################################
		_socket.on("setCharacterColor", async (_name,_pass,_tale,_color) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					doQuery("SELECT * FROM characters WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", (selCharacter) => {
						if (selCharacter.rowCount > 0)
							doQuery("UPDATE characters SET color = '"+String(_color)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_tale)+"';", () => {
								_socket.emit("characterColorChanged",_color);
							});
					});
				}
			});
		});
	//}
	//{ ####################################################### Tale 01: recibe el loop del cliente, haz la lógica, acceso a BD, y envía el loop de vuelta. #######################################################
		_socket.on("loop01", async (_name,_pass,_currentTale,_currentChapter,_event) => {
			// Si el usuario es válido...
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					// Lee el estado actual del jugador. Valida que no esté a mitad de un turno para poder ejecutarse.
					doQuery("SELECT * FROM player01 WHERE name = '"+String(_name)+"';", (selPlayer) => {
						if (selPlayer.rows[0].stunplayer == 0)
						{
							doQuery("SELECT * FROM enemies01 WHERE name = '"+String(_name)+"';", (selEnemies) => {
								// Asigna tu sprite y cuánto te stunearás acorde a la acción recibida.
								var _spritePlayer = "", _stunPlayer = 0;
								if (_event == "")
								{
									_spritePlayer = "Still";
									_stunPlayer = 0;
								}
								else if (_event == "clickWait")
								{
									_spritePlayer = "Still";
									_stunPlayer = 1;
								}
								else if (_event == "clickTurnLeft")
								{
									_spritePlayer = "Look";
									_stunPlayer = 1;
								}
								else if (_event == "clickTurnRight")
								{
									_spritePlayer = "Look";
									_stunPlayer = 1;
								}
								else if (_event == "clickMoveForwards")
								{
									_spritePlayer = "Move";
									_stunPlayer = 10;
								}
								else if (_event == "clickMoveBackwards")
								{
									_spritePlayer = "Move";
									_stunPlayer = 10;
								}
								else if (_event.substr(0,11) == "clickLookAt")
								{
									_spritePlayer = "Look";
									_stunPlayer = 1;
								}
				
								// Crea la estructura de datos del player.
								var _dataPlayer = {
									xPlayer:selPlayer.rows[0].xplayer,
									yPlayer:selPlayer.rows[0].yplayer,
									dirPlayer:selPlayer.rows[0].dirplayer,
									spritePlayer:_spritePlayer,
									stunPlayer:_stunPlayer
								};
								
								// Crea la estructura de datos de los enemigos.
								var _dataEnemies = [];
								for (var i = 0; i < selEnemies.rowCount; ++i)
								{
									_dataEnemies.push({
										nameEnemy:selEnemies.rows[0].nameenemy,
										xEnemy:selEnemies.rows[0].xenemy,
										yEnemy:selEnemies.rows[0].yenemy,
										dirEnemy:selEnemies.rows[0].direnemy,
										spriteEnemy:selEnemies.rows[0].spriteenemy,
										stunEnemy:selEnemies.rows[0].stunenemy
									});
								}
								
								// Ejecuta el loop.
								loop01(_name,_event,_dataPlayer,_dataEnemies);
							});
						}
					});
				}
			});
		});
		
		function loop01(_name,_event,_dataPlayer,_dataEnemies)
		{
			// Ejecuta la lógica sólo si es un turno de lógica. Si el stun es 0 (cargar datos) no.
			if (_dataPlayer.stunPlayer > 0)
			{
				// El player gira.
				if (_event == "clickTurnLeft") _dataPlayer.dirPlayer = angular(_dataPlayer.dirPlayer+45);
				else if (_event == "clickTurnRight") _dataPlayer.dirPlayer = angular(_dataPlayer.dirPlayer-45);
				_dataPlayer.dirPlayer = getMult(_dataPlayer.dirPlayer,45);
				if (_event.substr(0,11) == "clickLookAt") _dataPlayer.dirPlayer = _event.substr(11,3);
				
				// El player se mueve.
				var _spd = 100, _dir = -1;
				if (_event == "clickMoveForwards") _dir = _dataPlayer.dirPlayer;
				else if (_event == "clickMoveBackwards") _dir = _dataPlayer.dirPlayer+180;
				if (_dir != -1)
				{
					_dataPlayer.xPlayer = Math.round(_dataPlayer.xPlayer+_spd*dcos(_dir));
					_dataPlayer.yPlayer = Math.round(_dataPlayer.yPlayer-_spd*dsin(_dir));
				}
			
				// Los enemigos actúan.
				for (var i = 0; i < _dataEnemies.length; ++i)
				{
					// Te persigue.
					if (_dataEnemies[0].spriteEnemy == "Chase")
					{
						var _spd = 40;
						var _dir = pointdirection(_dataEnemies[0].xEnemy,_dataEnemies[0].yEnemy,_dataPlayer.xPlayer,_dataPlayer.yPlayer);
						_dataEnemies[0].xEnemy = Math.round(_dataEnemies[0].xEnemy+_spd*dcos(_dir));
						_dataEnemies[0].yEnemy = Math.round(_dataEnemies[0].yEnemy-_spd*dsin(_dir));
					}
				}
			}
			
			// END CYCLE. Si todavía sigue paralizado, repite el loop con los datos actualizados.
			_dataPlayer.stunPlayer = Math.max(_dataPlayer.stunPlayer-1,0);
			if (_dataPlayer.stunPlayer > 0) loop01(_name,_event,_dataPlayer,_dataEnemies);
			// Si ya llegó al final, guarda datos, recupera el control y envía los datos al cliente.
			else
			{
				_dataPlayer.spritePlayer = "Still";
				loop01SaveData(_name,_dataPlayer,_dataEnemies);
			}
		}
		
		function loop01SaveData(_name,_dataPlayer,_dataEnemies)
		{
			// Primero guarda el player.
			doQuery("UPDATE player01 SET xplayer = '"+String(_dataPlayer.xPlayer)+"', yplayer = '"+String(_dataPlayer.yPlayer)+"', dirplayer = '"+String(_dataPlayer.dirPlayer)+"', spriteplayer = '"+String(_dataPlayer.spritePlayer)+"', stunplayer = '"+String(_dataPlayer.stunPlayer)+"' WHERE name = '"+String(_name)+"';", () => {
				// Luego guarda cada enemigo.
				loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,0);
			});
		}
		
		function loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,_index)
		{
			var _i = _index;
			doQuery("UPDATE enemies01 SET nameenemy = '"+String(_dataEnemies[_i].nameEnemy)+"', xememy = '"+String(_dataEnemies[_i].xEnemy)+"', yenemy = '"+String(_dataEnemies[_i].yEnemy)+"', direnemy = '"+String(_dataEnemies[_i].dirEnemy)+"', spriteenemy = '"+String(_dataEnemies[_i].spriteEnemy)+"', stunenemy = '"+String(_dataEnemies[_i].stunEnemy)+"' WHERE name = '"+String(_name)+"';", () => {
				_i++
				if (_i < _dataEnemies.length) loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,_i);
				else _socket.emit("looped01",_dataPlayer,_dataEnemies);
			});
		}
	//}
});
//{ ####################################################### Scripts. #######################################################
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

	// Scripts.	
	function dcos(_ang)
	{
		return Math.cos(_ang*Math.PI/180);
	}
	
	function dsin(_ang)
	{
		return Math.sin(_ang*Math.PI/180);
	}
	
	function angular(_dir)
	{
		return (_dir%360 + 360)%360;
	}

	function pointDirection(_x1,_y1,_x2,_y2)
	{
		return angular(Math.atan2(-(_y2-_y1),_x2-_x1)*180/Math.PI);
	}

	function getMult(_valor,_mult)
	{
		return Math.floor((_valor + _mult/2)/_mult)*_mult;
	}
//}