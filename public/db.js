//#############################################################################################################################################################################################
//#################################### LOS INCLUDES Y CONEXIONES ##############################################################################################################################
//#############################################################################################################################################################################################

// Crea la conexión
var socket = io();/*io.connect(
	//'http://localhost:5000/'
	'https://node-example-tomato.herokuapp.com'
,{reconnect: true});*/

//############################################################################################################################################################################################################################
//#################################### INTERCAMBIO DE SEÑALES PARA LA LÓGICA #################################################################################################################################################
//############################################################################################################################################################################################################################

$(function(){
	// Hacemos click
	$("#showData").click(function (e) {
		console.log("Clicked");
		socket.emit('onRequest');
	});
});