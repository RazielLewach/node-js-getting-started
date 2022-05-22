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
						doQuery("INSERT INTO entity01(entity,fuerzaEntity,resistenciaEntity,precisionEntity,reflejosEntity,percepcionEntity,camuflajeEntity,inteligenciaEntity,voluntadEntity,heridasCabezaEntity,heridasCuerpoEntity,heridasBrazosEntity,heridasPiernasEntity) VALUES ('"+String(_name)+"Player','30','30','30','30','30','30','30','30','0','0','0','0');",() => {
							doQuery("INSERT INTO player01(name,entity,canactplayer) VALUES ('"+String(_name)+"','"+String(_name)+"Player','TRUE');",() => {});
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
								doQuery("UPDATE users set taleplaying = '"+String(_tale)+"', chapterplaying = '"+String(_chapter)+"' WHERE name = '"+String(_name)+"';",() => {});
								
								// Limpia el entorno y todos los datos.
								doQuery("DELETE FROM enemies01 where name = '"+String(_name)+"';",() => {});
								
								// Crea el entorno según el tale y chapter.
								// HUMANO, SANGRE Y PETRÓLEO.
								if (_tale == "01" && _chapter == "01") // Primera batalla contra el tipo con pala por haber matado a su amigo en el hielo.
								{
									doQuery("INSERT INTO entity01(entity,fuerzaEntity,resistenciaEntity,precisionEntity,reflejosEntity,percepcionEntity,camuflajeEntity,inteligenciaEntity,voluntadEntity,heridasCabezaEntity,heridasCuerpoEntity,heridasBrazosEntity,heridasPiernasEntity) VALUES ('"+String(_name)+"ExploradorPala','10','10','10','10','10','10','10','10','0','0','0','0');",() => {
										doQuery("INSERT INTO enemies01(name,entity,nameenemy,stateenemy) VALUES ('"+String(_name)+"','"+String(_name)+"ExploradorPala','ExploradorPala','Aggressive');",() => {});
									});
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
						if (selPlayer.rowCount > 0)
						{
							doQuery("SELECT * FROM entity01 WHERE entity = '"+String(selPlayer.rows[0].entity)+"';", (selPlayerEntity) => {
								var _loops = selPlayer.rows[0].canactplayer;
								doQuery("UPDATE player01 SET canactplayer = '"+String(false)+"' WHERE name = '"+String(_name)+"';", () => {
									// Crea la estructura de datos del player.
									var _dataPlayer = {
										canActPlayer:selPlayer.rows[0].canactplayer,
										fuerzaPlayer:selPlayerEntity.rows[0].fuerzaentity,
										resistenciaPlayer:selPlayerEntity.rows[0].resistenciaentity,
										precisionPlayer:selPlayerEntity.rows[0].precisionentity,
										reflejosPlayer:selPlayerEntity.rows[0].reflejosentity,
										percepcionPlayer:selPlayerEntity.rows[0].percepcionentity,
										camuflajePlayer:selPlayerEntity.rows[0].camuflajeentity,
										inteligenciaPlayer:selPlayerEntity.rows[0].inteligenciaentity,
										voluntadPlayer:selPlayerEntity.rows[0].voluntadentity,
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
						fuerzaEnemy:selEnemyEntity.rows[_i].fuerzaentity,
						resistenciaEnemy:selEnemyEntity.rows[_i].resistenciaentity,
						precisionEnemy:selEnemyEntity.rows[_i].precisionentity,
						reflejosEnemy:selEnemyEntity.rows[_i].reflejosentity,
						percepcionEnemy:selEnemyEntity.rows[_i].percepcionentity,
						camuflajeEnemy:selEnemyEntity.rows[_i].camuflajeentity,
						inteligenciaEnemy:selEnemyEntity.rows[_i].inteligenciaentity,
						voluntadEnemy:selEnemyEntity.rows[_i].voluntadentity,
						heridasCabezaEnemy:selEnemyEntity.rows[_i].heridascabezaentity,
						heridasCuerpoEnemy:selEnemyEntity.rows[_i].heridascuerpoentity,
						heridasBrazosEnemy:selEnemyEntity.rows[_i].heridasbrazosentity,
						heridasPiernasEnemy:selEnemyEntity.rows[_i].heridaspiernasentity
					});
					loadEnemy(_name,_event,_dataPlayer,_selEnemies,_dataEnemies,++_i,_loops);
				});
			}
			else
			{
				// Ejecuta el loop si es un turno posible a hacer.
				if (_loops) loop01(_name,_event,_dataPlayer,_dataEnemies);
				// Si no lo es, envía la vuelta sin más.
				else _socket.emit("looped01",_dataPlayer,_dataEnemies);
			}
		}
		
		function loop01(_name,_event,_dataPlayer,_dataEnemies)
		{
			// Ejecuta la lógica sólo si es un turno de lógica. Si el cargar datos no.
			var _ret = "";
			if (_event != "")
			{
				_ret += executePlayerStep(_event,_dataPlayer,_dataEnemies);
			
				// Los enemigos actúan.
				for (var i = 0; i < _dataEnemies.length; ++i)
					_ret += executeEnemyStep(_event,_dataPlayer,_dataEnemies[i]);
			}
			
			// Guarda los datos.
			loop01SaveData(_name,_dataPlayer,_dataEnemies,_ret);
		}
		
		function loop01SaveData(_name,_dataPlayer,_dataEnemies,_ret)
		{
			// Primero guarda el player.
			doQuery("UPDATE player01 SET canactplayer = '"+String(true)+"' WHERE name = '"+String(_name)+"';", () => {
				loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,0,_ret);
			});
		}
		
		function loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,_index,_ret)
		{
			// Luego guarda cada enemigo.
			var _i = _index;
			doQuery("UPDATE enemies01 SET nameenemy = '"+String(_dataEnemies[_i].nameEnemy)+"' WHERE name = '"+String(_name)+"';", () => {
				_i++
				if (_i < _dataEnemies.length) loop01SaveDataEnemy(_name,_dataPlayer,_dataEnemies,_i,_ret);
				else _socket.emit("looped01",_dataPlayer,_dataEnemies,_ret);
			});
		}
	//}
	//{ ####################################################### Tale 01: ejecuta un player step. #######################################################
		function executePlayerStep(_event,_player,_enemies)
		{
			let _ret = "";
			let _arr = _event.split("/");
			
			// Atacar en general.
			if (_arr[0] == "clickAtacar")
			{
				// Si decides combatir contra un enemigo, le causas daño con prioridad.
				let _chosenObjective = _arr[2];
				if (_chosenObjective == "enemy")
				{
					let _chosenIndex = _arr[3];
					let _enemy = _enemies[_chosenIndex];
					
					// Decide la potencia de tu ataque tomando tu stat usado.
					let _chosenOffensive = _arr[4];
					let _statOffensive = _player[_chosenOffensive+"Player"];
					_ret += getRolPlayerOffensive(_chosenOffensive,_statOffensive,_enemy);
					
					// Decide la defensa del rival tomando su stat. Utiliza su stat más elevado. Calcula la intensidad del daño y dónde es.
					let _statObjective = Math.max(_enemy.resistenciaEnemy,_enemy.reflejosEnemy,_enemy.camuflajeEnemy,_enemy.voluntadEnemy);
					var _danyo = Math.min(3,Math.max(1,Math.floor(_statOffensive/_statObjective)));
					let _chosenpart = _arr[1];
					_ret += getRolEnemyDefensive(_statObjective,_enemy,_danyo,_chosenpart);
					
					// ESTA PARTE DEBE USARSE DONDE EL ENEMIGO??????
					//let _chosenDefensive = _arr[5];
				}
			}
			
			return _ret;
		}
		function getRolPlayerOffensive(_chosenOffensive,_statOffensive,_enemy)
		{
			let _ret = "Te acercas al " + getEnemyName(_enemy.nameEnemy) + " y ";
			if (_chosenOffensive == "fuerza") _ret += "le asestas unas puñaladas frontales con tus manos puntiagudas endurecidas con sangre solidificada. ";
			else if (_chosenOffensive == "precision") _ret += "apuntas con precisión al cuello para propinarle un tajo directo. ";
			else if (_chosenOffensive == "percepcion") _ret += "percibes los puntos de su cuerpo con mayor flujo de sangre para rajarlos y hacerlo sangrar. ";
			else if (_chosenOffensive == "inteligencia") _ret += "lo perforas para lograr acceso a su sangre y manipular sus células para matarlo lentamente. ";
			return _ret;
		}
		function getRolEnemyDefensive(_statObjective,_enemy,_danyo,_chosenpart)
		{
			let _ret = "";
			
			// Enemigo: explorador de las nieves con una pala.
			if (_enemy.nameEnemy == "ExploradorPala")
			{
				if (_statObjective == _enemy.resistenciaEnemy) _ret += "Éste intenta alzar su pala para bloquear. ";
				else if (_statObjective == _enemy.reflejosEnemy) _ret += "Éste intenta mover su cuerpo a un lado para esquivar. ";
				else if (_statObjective == _enemy.camuflajeEnemy) _ret += "Éste intenta camuflarse con su entorno para evitarlo. ";
				else if (_statObjective == _enemy.voluntadEnemy) _ret += "Éste intenta, a pura fuerza de voluntad, resistir el impacto. ";
				
				if (_danyo == 1) _ret += "Su defensa es muy efectiva así que sólo recibe una herida leve en ";
				else if (_danyo == 2) _ret += "Su defensa logra aguantar así que recibe una herida grave en ";
				else if (_danyo == 3) _ret += "Su defensa fracasa así que recibe una herida mortal en ";
				_ret += String(_chosenpart) + ". ";
			}
		
			return _ret;
		}
	//}
	//{ ####################################################### Tale 01: ejecuta un enemy step (ExploradorPala). #######################################################
		function executeEnemyStep(_event,_player,_enemy)
		{
			let _ret = "";
			
			// Enemigo: explorador de las nieves con una pala.
			if (_enemy.nameEnemy == "ExploradorPala")
			{
				// Cada loop te intenta causar daño si está agresivo.
				if (_enemy.stateEnemy == "Aggressive")
				{
					
				}
			}
			
			return _ret;
		}
		function getEnemyName(_nameEnemy)
		{
			if (_nameEnemy == "ExploradorPala") return "explorador de la pala";
			else return ""
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
	
	function pointDistance(_x1,_y1,_x2,_y2)
	{
		return Math.sqrt(Math.pow(_x1-_x2,2)+Math.pow(_y1-_y2,2));
	}

	function getMult(_valor,_mult)
	{
		return Math.floor((_valor + _mult/2)/_mult)*_mult;
	}
//}