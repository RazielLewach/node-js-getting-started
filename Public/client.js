var socket = io();
var user = ""; // Nombre de usuario para chequear en el momento. Sólo se setea tras logins exitosos, pero aun así comprobar en cada acceso por si lo modifican con hacks.

// Señales de lógica enviadas.
$("#name").keypress((e) => {
	if (e.key == "Enter") login();
});
$("#pass").keypress((e) => {
	if (e.key == "Enter") login();
});

function login()
{
	socket.emit("login",$("#name").val(),$("#pass").val());
}

// Señales de lógica recibidas.
socket.on("newUserSuccess", (name) => {
	$("#msgSesion").text("Welcome to your account, "+String(name)+"!");
	user = name;
	$("#aSpaceTravel").css("display","inline");
});
socket.on("newUserFail", (name) => {
	$("#msgSesion").text("Wrong password for that account!");
	user = "";
});

// Abre las tales del menú.
function openTale(evt, taleName) {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(taleName).style.display = "block";
	evt.currentTarget.className += " active";
}