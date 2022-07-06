//{ ####################################################### Inicializaciones. #######################################################
	// Init.
	var express = require('express');
	var http = require("http");
	var fs = require("fs");
	//var port = process.env.PORT || 5000; // Esta línea para ONLINE.
	var port = 8080; // Esta línea para LOCAL.

	// Sockets.
	var app = express();
	var server = http.createServer(app);
	var { Server } = require("socket.io");
	var io = new Server(server);

	// PostgreSQL.
	var { Pool } = require('pg');
	var pool = new Pool({
		// Estas líneas para ONLINE.
		/*connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false
		}*/
		
		// Estas líneas para LOCAL.
		user: "postgres",
		database: 'postgres',
		password: 'test',
		host: '127.0.0.1',
		port: 5000
	});

	// Rutas para inicializar la ventana
	app.get('/', (req, res) => {
	  res.sendFile(__dirname + '/views/index.html');
	});

	server.listen(port, () => {
	  console.log('Listening hardcore on port',port);
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
						doQuery("INSERT INTO chapters(name, tale, chapter) VALUES ('"+String(_name)+"',01,01);",() => {});
						doQuery("INSERT INTO characters(name, tale, character, gender, color) VALUES ('"+String(_name)+"',01,'"+String(_name)+"','M','0');",() => {});
						
						// Inicializa las tablas de información permanente para cada tale.
						doQuery("INSERT INTO entity01(entity,inteligenciaEntity,fuerzaEntity,sigiloEntity,agilidadEntity,heridasCabezaEntity,heridasCuerpoEntity,heridasBrazosEntity,heridasPiernasEntity) VALUES ('"+String(_name)+"Player','30','30','30','30','0','0','0','0');",() => {
							doQuery("INSERT INTO player01(name,entity,canactplayer) VALUES ('"+String(_name)+"','"+String(_name)+"Player','T');",() => {});
						});
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
	//{ ####################################################### Cargar capítulo. Comprobar si el usuario tiene acceso al chapter de la tale y enviar el contenido (async). #######################################################
		_socket.on("loadChapter", async (_name,_pass,_tale,_chapter,_character,_gender,_color,_reset) => {
			doQuery("SELECT * FROM users WHERE name = '"+String(_name)+"' and pass = '"+String(_pass)+"';", (selUsers) => {
				if (selUsers.rowCount > 0)
				{
					// Comprueba el acceso al chapter.
					doQuery("SELECT * FROM chapters WHERE name = '"+String(_name)+"' and tale = "+String(_tale)+" and chapter >= "+String(_chapter)+";", (selChapter) => {
						if (selChapter.rowCount > 0)
						{
							// ... y posteriormente accede a BD para ver si inicializar los datos del chapter si no existen o si estabas con otro anterior.
							// Si no estás viendo ningún chapter, o es distinto al que has seleccionado, o pides reset, inicializa los datos de ese chapter y tale. En caso contrario no hará nada: los datos ya son válidos y "carga partida".
							if ((selUsers.rows[0].taleplaying == '00' && selUsers.rows[0].chapterplaying == '00') || (selUsers.rows[0].taleplaying != _tale && selUsers.rows[0].chapterplaying != _chapter) || _reset)
							{
								// Actualiza qué tale y chapter estás leyendo.
								doQuery("UPDATE users set taleplaying = '"+String(_tale)+"', chapterplaying = '"+String(_chapter)+"' WHERE name = '"+String(_name)+"';",() => {
									// Resetea las heridas del player y otras weas.
									doQuery("UPDATE entity01 set heridascabezaentity = '0', heridascuerpoentity = '0', heridasbrazosentity = '0', heridaspiernasentity = '0' WHERE entity = '"+String(_name)+"Player';",() => {
										doQuery("UPDATE player01 set canactplayer = 'T' WHERE name = '"+String(_name)+"';",() => {
											// Limpia todos los enemigos y sus entities asociadas.
											doQuery("DELETE FROM enemies01 where name = '"+String(_name)+"';",() => {
												doQuery("DELETE FROM entity01 where entity <> '"+String(_name)+"Player' and name = '"+String(_name)+"';",() => {
													// Crea el entorno según el tale y chapter.
													// HUMANO, SANGRE Y PETRÓLEO.
													if (_tale == "01" && _chapter == "01") // Primera batalla contra el tipo con pala por haber matado a su amigo en el hielo.
													{
														doQuery("INSERT INTO entity01(name,entity,inteligenciaEntity,fuerzaEntity,sigiloEntity,agilidadEntity,heridasCabezaEntity,heridasCuerpoEntity,heridasBrazosEntity,heridasPiernasEntity) VALUES ('"+String(_name)+"','"+String(_name)+"ExploradorPala','5','25','10','15','0','0','0','0');",() => {
															doQuery("INSERT INTO enemies01(name,entity,nameenemy,stateenemy,statchosenenemy) VALUES ('"+String(_name)+"','"+String(_name)+"ExploradorPala','ExploradorPala','Aggressive','"+String(getRandomStat())+"');",() => {
																chapterSuccess(_tale,_chapter,_character,_gender,_color);
															});
														});
													}
													else _socket.emit("chapterFail");
												});
											});
										});
									});
								});
							}
							// Si no, entonces no reinicias nada. Has cargado un chapter ya iniciado y sus datos se mantienen.
							else
							{
								doQuery("UPDATE player01 set canactplayer = 'T' WHERE name = '"+String(_name)+"';",() => {
									chapterSuccess(_tale,_chapter,_character,_gender,_color);
								});
							}
						}
						else _socket.emit("chapterFail");
					});
				}
				else _socket.emit("chapterFail");
			});
		});
		
		function chapterSuccess(_tale,_chapter,_character,_gender,_color)
		{
			fs.readFile(__dirname + "/tales/t"+String(_tale)+"/t"+String(_tale)+"c"+String(_chapter)+".txt", (_error, _data) => {
				if (_error) throw _error;
				_socket.emit("chapterSuccess",_data.toString().replaceAll("$CHA",_character).replaceAll("$GEN",_gender == "M" ? "o" : "a").replaceAll("$COL",_color));
			});
		}
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
						if (selPlayer.rowCount > 0)
						{
							doQuery("SELECT * FROM entity01 WHERE entity = '"+String(selPlayer.rows[0].entity)+"';", (selPlayerEntity) => {
								var _hurt = parseInt(selPlayerEntity.rows[0].heridascabezaentity)+parseInt(selPlayerEntity.rows[0].heridascuerpoentity)+parseInt(selPlayerEntity.rows[0].heridasbrazosentity)+parseInt(selPlayerEntity.rows[0].heridaspiernasentity) >= 12;
								var _loops = selPlayer.rows[0].canactplayer == 'T' && !_hurt;
								doQuery("UPDATE player01 SET canactplayer = 'F' WHERE name = '"+String(_name)+"';", () => {
									// Crea la estructura de datos del player.
									var _dataPlayer = {
										canActPlayer:selPlayer.rows[0].canactplayer,
										inteligenciaPlayer:selPlayerEntity.rows[0].inteligenciaentity,
										fuerzaPlayer:selPlayerEntity.rows[0].fuerzaentity,
										sigiloPlayer:selPlayerEntity.rows[0].sigiloentity,
										agilidadPlayer:selPlayerEntity.rows[0].agilidadentity,
										heridasCabezaPlayer:selPlayerEntity.rows[0].heridascabezaentity,
										heridasCuerpoPlayer:selPlayerEntity.rows[0].heridascuerpoentity,
										heridasBrazosPlayer:selPlayerEntity.rows[0].heridasbrazosentity,
										heridasPiernasPlayer:selPlayerEntity.rows[0].heridaspiernasentity
									};
									
									doQuery("SELECT * FROM enemies01 WHERE name = '"+String(_name)+"';", (selEnemies) => {
										// Crea la estructura de datos de los enemigos.
										loadEnemy(_name,_event,_dataPlayer,selEnemies,[],0,_loops);
									});
								});
							});
						}
					});
				}
			});
		});
		
		function loadEnemy(_name,_event,_dataPlayer,_selEnemies,_dataEnemies,_i,_loops)
		{
			if (_i < _selEnemies.rowCount)
			{
				doQuery("SELECT * FROM entity01 WHERE entity = '"+String(_selEnemies.rows[_i].entity)+"';", (selEnemyEntity) => {
					_dataEnemies.push({
						nameEnemy:_selEnemies.rows[_i].nameenemy,
						stateEnemy:_selEnemies.rows[_i].stateenemy,
						inteligenciaEnemy:selEnemyEntity.rows[_i].inteligenciaentity,
						fuerzaEnemy:selEnemyEntity.rows[_i].fuerzaentity,
						sigiloEnemy:selEnemyEntity.rows[_i].sigiloentity,
						agilidadEnemy:selEnemyEntity.rows[_i].agilidadentity,
						heridasCabezaEnemy:selEnemyEntity.rows[_i].heridascabezaentity,
						heridasCuerpoEnemy:selEnemyEntity.rows[_i].heridascuerpoentity,
						heridasBrazosEnemy:selEnemyEntity.rows[_i].heridasbrazosentity,
						heridasPiernasEnemy:selEnemyEntity.rows[_i].heridaspiernasentity,
						statChosenEnemy:_selEnemies.rows[_i].statchosenenemy
					});
					loadEnemy(_name,_event,_dataPlayer,_selEnemies,_dataEnemies,++_i,_loops);
				});
			}
			else
			{
				// Ejecuta el loop si es un turno posible a hacer.
				if (_loops) loop01(_name,_event,_dataPlayer,_dataEnemies);
				// Si no lo es, envía la vuelta sin más.
				else
				{
					_dataEnemies.forEach(_enemy => {
						_enemy.statChosenEnemy = getTextFromStatChosen(_enemy.nameEnemy,_enemy.statChosenEnemy);
					});
					_socket.emit("looped01",_dataPlayer,_dataEnemies,[]);
				}
			}
		}
		
		function loop01(_name,_event,_dataPlayer,_dataEnemies)
		{
			// Ejecuta la lógica sólo si es un turno de lógica. Si el cargar datos no.
			let _ret = [];
			if (_event != "")
			{
				// El player actúa.
				_ret.push(executePlayerStep(_event,_dataPlayer,_dataEnemies));
				
				// Los enemigos actúan.
				_dataEnemies.forEach(_enemy => {
					let _aux = executeEnemyStep(_event,_dataPlayer,_enemy);
					if (_aux != "") _ret.push(_aux);
				});
				
				_ret.push(checkPlayerDeathGeneral(_dataPlayer));
				var _victory = checkPlayerVictoryGeneral(_dataEnemies);
				_ret.push(_victory[0]);
				_ret.push(_victory[1]);
			}
			
			// Guarda los datos.
			loop01SaveData(_name,_dataPlayer,_dataEnemies,_ret);
		}
		
		function loop01SaveData(_name,_dataPlayer,_dataEnemies,_ret)
		{
			// Primero guarda el player.
			doQuery("UPDATE player01 SET canactplayer = 'T' WHERE name = '"+String(_name)+"';", () => {
				doQuery("UPDATE entity01 SET heridascabezaentity = '"+String(_dataPlayer.heridasCabezaPlayer)+"', heridascuerpoentity = '"+String(_dataPlayer.heridasCuerpoPlayer)+"', heridasbrazosentity = '"+String(_dataPlayer.heridasBrazosPlayer)+"', heridaspiernasentity = '"+String(_dataPlayer.heridasPiernasPlayer)+"' WHERE entity = '"+String(_name)+"Player';", () => {
					// Chequea si ganaste y guarda desbloquear el siguiente capítulo. Hay que leer en BD qué capítulo estamos jugando para haber llegado a este punto (inequívoco) y asignarnos ese +1.
					if (checkPlayerVictoryGeneral(_dataEnemies)[0] != "")
						doQuery("SELECT * from users WHERE name = '"+String(_name)+"';", (_selUsers) => {
							doQuery("UPDATE chapters SET chapter = '"+String(_selUsers.rows[0].chapterplaying+1)+"' WHERE name = '"+String(_name)+"' and tale = '"+String(_selUsers.rows[0].taleplaying)+"';", () => {
								loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,0,_ret);
							});
						});
					else loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,0,_ret);
				});
			});
		}
		
		function loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,_index,_ret)
		{
			// Luego guarda cada enemigo.
			let _i = _index;
			doQuery("UPDATE enemies01 SET statchosenenemy = '"+String(_dataEnemies[_i].statChosenEnemy)+"' WHERE name = '"+String(_name)+"';", () => {
				doQuery("UPDATE entity01 SET heridascabezaentity = '"+String(_dataEnemies[_i].heridasCabezaEnemy)+"', heridascuerpoentity = '"+String(_dataEnemies[_i].heridasCuerpoEnemy)+"', heridasbrazosentity = '"+String(_dataEnemies[_i].heridasBrazosEnemy)+"', heridaspiernasentity = '"+String(_dataEnemies[_i].heridasPiernasEnemy)+"' WHERE entity = '"+String(_name)+String(_dataEnemies[_i].nameEnemy)+"';", () => {
					_dataEnemies[_i].statChosenEnemy = getTextFromStatChosen(_dataEnemies[_i].nameEnemy,_dataEnemies[_i].statChosenEnemy);
					_i++
					if (_i < _dataEnemies.length) loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,_i,_ret);
					else _socket.emit("looped01",_dataPlayer,_dataEnemies,_ret);
				});
			});
		}
	//}
	//{ ####################################################### Tale 01: ejecuta un player step. #######################################################
		function executePlayerStep(_event,_player,_enemies)
		{
			let _ret = "";
			let _arr = _event.split("/");
			
			if (_arr[0] != "")
			{
				// Si decides combatir contra un enemigo, le causas daño con prioridad.
				let _chosenObjective = _arr[2];
				if (_chosenObjective == "enemy")
				{
					let _chosenIndex = _arr[3];
					let _enemy = _enemies[_chosenIndex];
					
					// Decide la potencia de tu ataque tomando tu stat usado.
					let _chosenOffensive = _arr[4];
					let _partOffensive;
					if (_chosenOffensive == "inteligencia") _partOffensive = "Cabeza";
					else if (_chosenOffensive == "fuerza") _partOffensive = "Cuerpo";
					else if (_chosenOffensive == "sigilo") _partOffensive = "Brazos";
					else if (_chosenOffensive == "agilidad") _partOffensive = "Piernas";
					let _statOffensive = Math.round(_player[_chosenOffensive+"Player"]*(1-0.25*_player["heridas"+String(_partOffensive)+"Player"]));
					if (statWins(_chosenOffensive,_enemy.statChosenEnemy)) _statOffensive *= 2;
					_ret += getRolPlayerOffensive(_chosenOffensive,_statOffensive,_enemy);
					
					// El rival utiliza el stat que ha elegido para esta ronda.
					let _statDefensive = 1;
					if (_enemy.statChosenEnemy == "inteligencia") _statDefensive = Math.round(_enemy.inteligenciaEnemy*(1-0.25*_enemy.heridasCabezaEnemy));
					else if (_enemy.statChosenEnemy == "fuerza") _statDefensive = Math.round(_enemy.fuerzaEnemy*(1-0.25*_enemy.heridasCuerpoEnemy));
					else if (_enemy.statChosenEnemy == "sigilo") _statDefensive = Math.round(_enemy.sigiloEnemy*(1-0.25*_enemy.heridasBrazosEnemy));
					else if (_enemy.statChosenEnemy == "agilidad") _statDefensive = Math.round(_enemy.agilidadEnemy*(1-0.25*_enemy.heridasPiernasEnemy));

					
					// Calcula la intensidad del daño y dónde es.
					let _danyo = Math.min(3,Math.max(1,Math.floor(_statOffensive/_statDefensive)));
					let _chosenpart = _arr[1];
					_ret += getRolEnemyDefensive(_enemy,_danyo,_chosenpart,_chosenOffensive,_enemy.statChosenEnemy);
					
					if (_chosenpart == "la cabeza") _enemy.heridasCabezaEnemy = Math.min(_enemy.heridasCabezaEnemy+_danyo,3);
					else if (_chosenpart == "el cuerpo") _enemy.heridasCuerpoEnemy = Math.min(_enemy.heridasCuerpoEnemy+_danyo,3);
					else if (_chosenpart == "los brazos") _enemy.heridasBrazosEnemy = Math.min(_enemy.heridasBrazosEnemy+_danyo,3);
					else if (_chosenpart == "las piernas") _enemy.heridasPiernasEnemy = Math.min(_enemy.heridasPiernasEnemy+_danyo,3);
					
					// Procede a infligir el daño y matarlo si es el caso.
					if (_enemy.heridasCabezaEnemy+_enemy.heridasCuerpoEnemy+_enemy.heridasBrazosEnemy+_enemy.heridasPiernasEnemy >= 12) _enemy.stateEnemy = "Dead";
				}
			}
			
			return _ret;
		}
		function getRolPlayerOffensive(_chosenOffensive,_statOffensive,_enemy)
		{
			let _ret = "Te acercas al " + getEnemyName(_enemy.nameEnemy) + " y ";
			if (_chosenOffensive == "inteligencia") _ret += "concentras sangre en tu cerebro para provocarle daño con tu mente. ";
			else if (_chosenOffensive == "fuerza") _ret += "le realizas un ataque fuerte pero extremadamente lento con tus manos. ";
			else if (_chosenOffensive == "sigilo") _ret += "buscas camuflarte en el entorno para realizarle un ataque sigiloso con tus manos. ";
			else if (_chosenOffensive == "agilidad") _ret += "le realizas un ataque débil pero extremadamente rápido con tus manos. ";
			return _ret;
		}
		function getRolPlayerDefensive(_chosenDefensive,_player,_danyo,_chosenpart,_chosenOffensive,_chosenDefensive)
		{
			let _ret = "";
			
			if (_chosenDefensive == "inteligencia") _ret += "Te concentras y con tu voluntad resistes el daño ";
			else if (_chosenDefensive == "fuerza") _ret += "Colocas tus brazos al frente y lo bloqueas ";
			else if (_chosenDefensive == "sigilo") _ret += "Te camuflas con tu entorno y lo evitas ";
			else if (_chosenDefensive == "agilidad") _ret += "Mueves tu cuerpo a un lado y lo esquivas ";
			
			let _txtVentaja = "";
			if (statWins(_chosenOffensive,_chosenDefensive)) _txtVentaja = "viendo tu "+String(_chosenDefensive)+" flaquear ante su "+String(_chosenOffensive)+", ";
			
			if (_danyo == 1) _ret += "moderadamente, "+String(_txtVentaja)+"recibiendo una herida leve en ";
			else if (_danyo == 2) _ret += "con dificultad, "+String(_txtVentaja)+"recibiendo una herida grave en ";
			else if (_danyo == 3) _ret += "desastrosamente, "+String(_txtVentaja)+"recibiendo una herida crítica en ";
			let _part = "";
			if (_chosenpart == 0) _part = "tu cabeza";
			else if (_chosenpart == 1) _part = "tu cuerpo";
			else if (_chosenpart == 2) _part = "tus brazos";
			else if (_chosenpart == 3) _part = "tus piernas";
			_ret += String(_part) + ". ";
			
			if (statWins(_chosenOffensive,_chosenDefensive)) _ret += "Su "+String(_chosenOffensive)+" logra ventaja contra tu "+String(_chosenDefensive)+". ";
		
			return _ret;
		}
	//}
	//{ ####################################################### Tale 01: ejecuta un enemy step (ExploradorPala). #######################################################
		function executeEnemyStep(_event,_player,_enemy)
		{
			let _ret = "";
			let _arr = _event.split("/");
			
			if (_enemy.nameEnemy == "ExploradorPala")
			{
				// Cada loop te intenta causar daño si está agresivo y nada se lo impide.
				if (_enemy.stateEnemy == "Aggressive")
				{
					// Decide la potencia de su ataque tomando su stat elegido.
					let _chosenDefensive = _arr[4];
					let _statOffensive = 0;					
					if (_enemy.statChosenEnemy == "inteligencia") _statOffensive = Math.round(_enemy.inteligenciaEnemy*(1-0.25*_enemy.heridasCabezaEnemy));
					else if (_enemy.statChosenEnemy == "fuerza") _statOffensive = Math.round(_enemy.fuerzaEnemy*(1-0.25*_enemy.heridasCuerpoEnemy));
					else if (_enemy.statChosenEnemy == "sigilo") _statOffensive = Math.round(_enemy.sigiloEnemy*(1-0.25*_enemy.heridasBrazosEnemy));
					else if (_enemy.statChosenEnemy == "agilidad") _statOffensive = Math.round(_enemy.agilidadEnemy*(1-0.25*_enemy.heridasPiernasEnemy));
					if (statWins(_enemy.statChosenEnemy,_chosenDefensive)) _statOffensive *= 2;
					_ret += getRolEnemyOffensive(_statOffensive,_enemy);
					
					// El stat de defensa que has elegido.
					var _partDefensive;
					if (_chosenDefensive == "inteligencia") _partDefensive = "Cabeza";
					else if (_chosenDefensive == "fuerza") _partDefensive = "Cuerpo";
					else if (_chosenDefensive == "sigilo") _partDefensive = "Brazos";
					else if (_chosenDefensive == "agilidad") _partDefensive = "Piernas";
					let _statDefensive = _player[_chosenDefensive+"Player"]*(1-0.25*_player["heridas"+String(_partDefensive)+"Player"]);
					
					// Calcula la intensidad del daño y ataca a una zona aleatoria.
					let _danyo = Math.min(3,Math.max(1,Math.floor(_statOffensive/_statDefensive)));
					let _chosenpart = -1, _auxHeridas = 0, _cnt = 0;
					do {
						_chosenpart = Math.round(3*Math.random()); // 0 Cabeza, 1 Cuerpo, 2 brazos, 3 Piernas
						_auxHeridas = _player["heridas"+String(_chosenpart == 0 ? "Cabeza" : (_chosenpart == 1 ? "Cuerpo" : (_chosenpart == 2 ? "Brazos" : "Piernas")))+"Player"];
						_cnt++;
					}
					while(_auxHeridas >= 3 && _cnt < 9999);
					_ret += getRolPlayerDefensive(_chosenDefensive,_player,_danyo,_chosenpart,_enemy.statChosenEnemy,_chosenDefensive);
					
					if (_chosenpart == 0) _player.heridasCabezaPlayer = Math.min(_player.heridasCabezaPlayer+_danyo,3);
					else if (_chosenpart == 1) _player.heridasCuerpoPlayer = Math.min(_player.heridasCuerpoPlayer+_danyo,3);
					else if (_chosenpart == 2) _player.heridasBrazosPlayer = Math.min(_player.heridasBrazosPlayer+_danyo,3);
					else if (_chosenpart == 3) _player.heridasPiernasPlayer = Math.min(_player.heridasPiernasPlayer+_danyo,3);
					
					// Finalmente elige el stat que usará en su próximo turno.
					_enemy.statChosenEnemy = getRandomStat();
				}
			}
			
			return _ret;
		}
		function getRolEnemyOffensive(_statOffensive,_enemy)
		{
			let _ret = "";
			if (_enemy.nameEnemy == "ExploradorPala")
			{
				_ret = "El " + getEnemyName(_enemy.nameEnemy) + " se acerca a ti y ";
				if (_statOffensive == Math.round(_enemy.inteligenciaEnemy*(1-0.25*_enemy.heridasCabezaEnemy))) _ret += "grita con furia para causarte daño con su mente. ";
				else if (_statOffensive == Math.round(_enemy.fuerzaEnemy*(1-0.25*_enemy.heridasCuerpoEnemy))) _ret += "te realiza un ataque fuerte pero extremadamente lento con la pala. ";
				else if (_statOffensive == Math.round(_enemy.sigiloEnemy*(1-0.25*_enemy.heridasBrazosEnemy))) _ret += "busca camuflarse en el entorno para realizarte un ataque sigiloso con su pala. ";
				else if (_statOffensive == Math.round(_enemy.agilidadEnemy*(1-0.25*_enemy.heridasPiernasEnemy))) _ret += "te realiza un ataque débil pero extremadamente rápido con la pala. ";
			}
			return _ret;
		}
		
		function getRolEnemyDefensive(_enemy,_danyo,_chosenpart,_chosenOffensive,_chosenDefensive)
		{
			let _ret = "";
			
			// Enemigo: explorador de las nieves con una pala.
			if (_enemy.nameEnemy == "ExploradorPala")
			{
				if (_enemy.statChosenEnemy == "inteligencia") _ret += "Éste grita para motivarse y resiste el impacto ";
				else if (_enemy.statChosenEnemy == "fuerza") _ret += "Éste alza su pala y lo bloquea ";
				else if (_enemy.statChosenEnemy == "sigilo") _ret += "Éste se camufla con su entorno y lo evita ";
				else if (_enemy.statChosenEnemy == "agilidad") _ret += "Éste mueve su cuerpo a un lado y lo esquiva ";
				
				let _txtVentaja = "";
				if (statWins(_chosenOffensive,_chosenDefensive)) _txtVentaja = "viendo su "+String(_chosenDefensive)+" flaquear ante tu "+String(_chosenOffensive)+", ";
				
				if (_danyo == 1) _ret += "moderadamente, "+String(_txtVentaja)+"recibiendo una herida leve en ";
				else if (_danyo == 2) _ret += "con dificultad, "+String(_txtVentaja)+"recibiendo una herida grave en ";
				else if (_danyo == 3) _ret += "desastrosamente, "+String(_txtVentaja)+"recibiendo una herida crítica en ";
				_ret += String(_chosenpart) + ". ";
			}
		
			return _ret;
		}
		function getEnemyName(_nameEnemy)
		{
			if (_nameEnemy == "ExploradorPala") return "explorador de la pala";
			else return ""
		}
		function checkPlayerDeathGeneral(_player)
		{
			let _ret = "";
			if (_player.heridasCabezaPlayer+_player.heridasCuerpoPlayer+_player.heridasBrazosPlayer+_player.heridasPiernasPlayer >= 12)
			{
				_ret = "Has muerto. El dolor es insoportable. Tu cuerpo cae en pedazos y no puedes mantener tu forma humanoide. Toda la sangre dentro de ti sale a chorros y sólo quedan células inertes esperando la putrefacción.";
			}
			return _ret;
		}
		function checkPlayerVictoryGeneral(_dataEnemies)
		{
			let _ret = ["",""];
			let _won = true;
			_dataEnemies.forEach(_enemy => {
				if (_enemy.heridasCabezaEnemy+_enemy.heridasCuerpoEnemy+_enemy.heridasBrazosEnemy+_enemy.heridasPiernasEnemy < 12) _won = false;
			});
			if (_won) _ret = ["El explorador cae frente a ti y sin vida. Su pala resuena contra la roca y pronto su sangre se une a la de su compañero. Ya nada ni nadie te impide salir de aquí.","¡SIGUIENTE CAPÍTULO DESBLOQUEADO!"];
			return _ret;
		}
		function getRandomStat()
		{
			let _stats = ["inteligencia","fuerza","sigilo","agilidad"];
			return _stats[Math.round(3*Math.random())];
		}
		function getTextFromStatChosen(_nameEnemy,_statChosenEnemy)
		{
			let _state = "";
			if (_nameEnemy == "ExploradorPala")
			{
				let _texts = [
					[
						"abre sus ojos con prisa",
						"cierra los ojos con calma",
						"inhala con prisa",
						"exhala con calma",
						"asiente con decisión"
					],
					[
						"sujeta su pala con firmeza",
						"aprieta sus puños",
						"coloca su cuerpo bien erguido",
						"posiciona sus pies en una postura firme",
						"aprieta los dientes"
					],
					[
						"busca salir de tu campo visual",
						"se posiciona detrás de los obstáculos",
						"levanta polvo al arrastrar los pies",
						"se coloca de cuclillas",
						"acerca su cuerpo al suelo"
					],
					[
						"da saltitos pequeños",
						"posiciona sus pies en una postura delicada",
						"te sigue con precisión con la mirada",
						"sujeta su pala con delicadeza",
						"abre la palma de sus manos"
					]
				];
				_texts.forEach(e => {e.sort();});
				let _iStat = _statChosenEnemy == "inteligencia" ? 0 : (_statChosenEnemy == "fuerza" ? 1 : (_statChosenEnemy == "sigilo" ? 2 : 3));
				_state = "Puedes ver cómo " + _texts[_iStat][0] + ", después " + _texts[_iStat][1] + " y finalmente " + _texts[_iStat][2] + ". ";
			}
			return _state;
		}
		function statWins(_offensive,_defensive)
		{
			return (_offensive == "inteligencia" && _defensive == "sigilo") || (_offensive == "sigilo" && _defensive == "agilidad") || (_offensive == "agilidad" && _defensive == "fuerza") || (_offensive == "fuerza" && _defensive == "inteligencia");
		}
	//}
});
//{ ####################################################### Scripts. #######################################################
	// Querys.
	async function doQuery(query,func)
	{
		const client = await pool.connect();
		const data = await client.query(query).
		then(res => {
			func(res);
			client.release();
			return true;
		}).
		catch(e => {
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
	
	function pointDistance(_x1,_y1,_x2,_y2)
	{
		return Math.sqrt(Math.pow(_x1-_x2,2)+Math.pow(_y1-_y2,2));
	}

	function getMult(_valor,_mult)
	{
		return Math.floor((_valor + _mult/2)/_mult)*_mult;
	}
//}