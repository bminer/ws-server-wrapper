/* This chat server uses "ws" for Node.js WebSockets.
	"node-module-concat" is used to bundle the client-side code at run-time.
*/
const http = require("http")
	, fs = require("fs")
	, WebSocketServer = require("ws").Server
	, WebSocketServerWrapper = require("../")
	, modConcat = require("module-concat");

// Create new HTTP server and a new WebSocketServer
const server = http.createServer(httpResHandler)
	, socketServer = new WebSocketServerWrapper(
		new WebSocketServer({server: server})
	);

// Save all logged in `users`; keys are usernames
var users = {};
function userLogout(username) {
	if(users[username]) {
		delete users[username];
		// Notify all other users
		for(var i in users) {
			users[i].emit("message", "system", username + " has logged out");
		}
	}
}
// Upon disconnect, ensure user is logged out
socketServer.on("disconnect", (socket) => {
	const username = socket.get("username");
	userLogout(username);
});

// Setup event handlers on the WebSocketServerWrapper for the "chat" channel
socketServer.of("chat").on("login", function(username) {
	/* `this` refers to the WebSocketWrapper "chat" channel, which is unique
		for a given WebSocket */
	if(username === "system" ||
		(users[username] && users[username] !== this) )
	{
		// Error is sent back to the client
		throw new Error(`Username '${username}' is taken!`);
	} else {
		// Notify all other users of user login
		for(var i in users) {
			users[i].emit("message", "system", username + " has logged in");
		}
		// Save the username
		this.set("username", username);
		// Note that the "chat" channel is actually stored in `users[username]`
		users[username] = this;
	}
}).on("message", function(msg) {
	const username = this.get("username");
	if(username) {
		// We're logged in, so relay the message to all clients
		for(var i in users) {
			users[i].emit("message", username, msg);
		}
	} else {
		throw new Error("Please log in first!");
	}
}).on("logout", function() {
	const username = this.get("username");
	userLogout(username);
});

// serves up a browser-compatible version of req.URL (which should correspond to a .JS file) by // using modConCat. Cache output, and only regenerate whenever original .JS file changes
function concatAndCache(baselocation, req, res) {

	var inputFile	= baselocation + req.url;
	var outputFile 	= inputFile + ".modConcat";
		
	// compare dates on input vs. output files
	// if input file is newer, we need to regenerate output file
	// otherwise, just serve up output file
	
	fs.stat(inputFile,  (err, stat_input) => {
		fs.stat(outputFile, (err, stat_output) => {

			var NeedsRegenerated;
		
			// input file doesn't exist?? nothing we can do
			if (stat_input === undefined) return;	
			
			// output file doesn't exist?? then we definitely need to regenerate it
			if (stat_output === undefined) 
				NeedsRegenerated = true;
			else 
				// both input and output files exit
				// only regenerate if input has been modified more recently
				// than the cached version
				NeedsRegenerated = (stat_input.mtime > stat_output.mtime);
			 
			// if necessary, regenerate outputfile from inputfile
			if (NeedsRegenerated) {			
				modConcat(inputFile, outputFile, (err, stats) => {
					if(err) throw err;
					console.log(stats.files.length + " were combined into " + outputFile);
					res.setHeader("Content-Type", "application/javascript");
					fs.createReadStream(outputFile).pipe(res);
				});
			} else {
				// the file doesn't need regenerated, so just serve up the cached copy
				console.log("using cached file...");
				
				res.setHeader("Content-Type", "application/javascript");
				fs.createReadStream(outputFile).pipe(res);
			}
		  });
		});
}

function httpResHandler(req, res) {
	// Serve index.html and client.js
	if(req.url === "/") {
		res.setHeader("Content-Type", "text/html");
		fs.createReadStream(__dirname + "/index.html").pipe(res);
	} else if(req.url === "/client.js") {
		
		// special logic needed for client.js because
		// it needs ran through modConcat
		concatAndCache(__dirname, req, res);

	} else {
		res.statusCode = 404;
		res.end("Not Found");
	}
}

// Start the server after building client_build.js
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log("Listening on port " + PORT);
});
