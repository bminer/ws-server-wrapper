// This chat server uses "ws" for Node.js WebSockets.
const http = require("http"),
	fs = require("fs"),
	path = require("path"),
	WebSocketServer = require("ws").Server,
	WebSocketServerWrapper = require("../")

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

const wsWrapperDir = path.resolve(__dirname, "../node_modules/ws-wrapper")
const eventemitter3Dir = path.resolve(
	__dirname,
	"../node_modules/eventemitter3"
)

function serveNodeModuleDir(dir, urlPrefix, req, res) {
	const filePath = path.join(dir, req.url.slice(urlPrefix.length))
	if (!filePath.startsWith(dir)) {
		res.statusCode = 403
		return res.end("Forbidden")
	}
	res.setHeader("Content-Type", "text/javascript")
	const stream = fs.createReadStream(filePath)
	stream.on("error", () => {
		res.statusCode = 404
		res.end("Not Found")
	})
	stream.pipe(res)
}

function httpResHandler(req, res) {
	if (req.url === "/") {
		res.setHeader("Content-Type", "text/html")
		fs.createReadStream(__dirname + "/index.html").pipe(res)
	} else if (req.url === "/client.js") {
		res.setHeader("Content-Type", "text/javascript")
		fs.createReadStream(__dirname + "/client.js").pipe(res)
	} else if (req.url.startsWith("/ws-wrapper/")) {
		serveNodeModuleDir(wsWrapperDir, "/ws-wrapper/", req, res)
	} else if (req.url.startsWith("/eventemitter3/")) {
		serveNodeModuleDir(eventemitter3Dir, "/eventemitter3/", req, res)
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
