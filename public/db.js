// Crea la conexión
var socket = io();

// Señales de lógica enviadas.
$(function(){
	// Hacemos click
	$("#showData").click(function (e) {
		console.log("Clicked");
		socket.emit('onRequest');
	});
});