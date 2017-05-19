const WebSocketWrapper = require("ws-wrapper"),
	WebSocketServerChannel = require("./channel");

/* Define a WebSocketServerWrapper, which (in a weird way) is also a
	WebSocketServerChannel. */
class WebSocketServerWrapper extends WebSocketServerChannel {
	constructor(webSocketServer, options) {
		// This is a WebSocketServerChannel with `null` as the channel name
		super(null);
		/* Set a reference back to myself so that WebSocketServerChannel
			handlers work properly */
		this._wrapper = this;
		this.options = options || {};
		// Set default request timeout
		if(this.options.requestTimeout === undefined) {
			this.options.requestTimeout = 2 * 60 * 1000; // 2 minutes
		}

		// Reference to actual WebSocketServer
		this.server = webSocketServer;
		// Set of connected WebSockets
		this.sockets = new Set();
		// Map of WebSocketServerChannels
		this.channels = {};

		// When a WebSocket connects to the server...
		this.server.on("connection", (socket) => {
			// Wrap the WebSocket
			socket = new WebSocketWrapper(socket, this.options);
			// Update Set of connected WebSockets
			this.sockets.add(socket);
			socket.on("disconnect", () => {
				this.sockets.delete(socket);
				// Abort send queue and pending requests
				socket.abort();
				// Emit disconnect event
				this.emit("disconnect", socket);
			});
			// Add socket to all channels
			this.addSocket(socket);
			for(let name in this.channels) {
				this.channels[name].addSocket(socket);
			}
			// Emit connection event
			this.emit("connection", socket);
		});
		// Emit errors
		this.server.on("error", (err) => {
			this.emit("error", err);
		});
	}

	of(namespace) {
		if(!this.channels[namespace])
			this.channels[namespace] =
				new WebSocketServerChannel(namespace, this);
		return this.channels[namespace];
	}

	close() {
		return this.server.close();
	}
}

module.exports = WebSocketServerWrapper;
