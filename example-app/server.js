/* This chat server uses "ws" for Node.js WebSockets.
	"node-module-concat" is used to bundle the client-side code at run-time.
*/
const http = require("http"),
	fs = require("fs"),
	WebSocketServer = require("ws").Server,
	WebSocketServerWrapper = require("../"),
	modConcat = require("module-concat")

// Create new HTTP server and a new WebSocketServer
const server = http.createServer(httpResHandler),
	socketServer = new WebSocketServerWrapper(new WebSocketServer({ server }))

// Save all logged in `users`; keys are usernames
const users = {}
function userLogout(username) {
	if (users[username]) {
		delete users[username]
		// Notify all other users
		for (const i in users) {
			users[i].emit("message", "system", username + " has logged out")
		}
	}
}
// Upon disconnect, ensure user is logged out
socketServer.on("disconnect", (socket) => {
	const username = socket.get("username")
	userLogout(username)
})

// Setup event handlers on the WebSocketServerWrapper for the "chat" channel
socketServer
	.of("chat")
	.on("login", function (username) {
		/* `this` refers to the WebSocketWrapper "chat" channel, which is unique
		for a given WebSocket */
		if (
			username === "system" ||
			(users[username] && users[username] !== this)
		) {
			// Error is sent back to the client
			throw new Error(`Username '${username}' is taken!`)
		} else {
			// Notify all other users of user login
			for (const i in users) {
				users[i].emit("message", "system", username + " has logged in")
			}
			// Save the username
			this.set("username", username)
			// Note that the "chat" channel is actually stored in `users[username]`
			users[username] = this
		}
	})
	.on("message", function (msg) {
		const username = this.get("username")
		if (username) {
			// We're logged in, so relay the message to all clients
			for (const i in users) {
				users[i].emit("message", username, msg)
			}
		} else {
			throw new Error("Please log in first!")
		}
	})
	.on("logout", function () {
		const username = this.get("username")
		userLogout(username)
	})

function httpResHandler(req, res) {
	// Serve index.html and client.js
	if (req.url === "/") {
		res.setHeader("Content-Type", "text/html")
		fs.createReadStream(__dirname + "/index.html").pipe(res)
	} else if (req.url === "/client.js") {
		// Build client.js using "node-module-concat"
		// TODO: Make this happen only once; not for each request!
		const src = new modConcat.ModuleConcatStream(__dirname + "/client.js", {
			browser: true,
		})
		res.setHeader("Content-Type", "text/javascript")
		src.pipe(res)
	} else {
		res.statusCode = 404
		res.end("Not Found")
	}
}

// Start the server after building client_build.js
const { PORT = 3000 } = process.env
server.listen(PORT, () => {
	console.log("Listening on port " + PORT)
})
