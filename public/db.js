// Crea la conexión
var socket = io.connect("https://node-example-tomato.herokuapp.com/db");

// Señales de lógica enviadas.
$(function(){
	// Hacemos click
	$("#showData").click(function (e) {
		console.log("Clicked");
		socket.emit('onRequest');
	});
});