const EventEmitter = require("events").EventEmitter
	, WebSocketWrapper = require("ws-wrapper");

// Define the WebSocket server channel
class WebSocketServerChannel {
	constructor(name, server) {
		// Channel name
		this.name = name;
		// Reference to WebSocketServerWrapper
		this._wrapper = server;
		// Pass-through EventEmitter implementation
		this._emitter = new EventEmitter();
	}

	// Add all registered event handlers to this socket
	addSocket(socket) {
		// Bind newly connected socket to all registered event handlers
		this._emitter.eventNames().forEach((eventName) => {
			if(this.name != null || !WebSocketServerChannel.NO_WRAP.has(eventName) ) {
				this._emitter.listeners(eventName).forEach((listener) => {
					if(this.name != null) {
						socket.of(this.name).on(eventName, listener);
					} else {
						socket.on(eventName, listener);
					}
				});
			}
		});
	}

	eventNames() {
		return this._emitter.eventNames();
	}

	listeners(eventName) {
		return this._emitter.listeners(eventName);
	}
}

// WebSocketServerChannel should provide EventEmitter-like API
["emit",
	"on",
	"off",
	"addListener",
	"prependListener",
	"removeAllListeners",
	"removeListener"]
.forEach((method) => {
	WebSocketServerChannel.prototype[method] = function(eventName) {
		// Save global event listener state in `_emitter`
		this._emitter[method].apply(this._emitter, arguments);
		/* Then pass event handling to all connected sockets (except for a
			few events) */
		if(this.name != null || !WebSocketServerChannel.NO_WRAP.has(eventName) ) {
			this._wrapper.sockets.forEach((socket) => {
				if(this.name != null)
					socket.of(name)[method].apply(socket, arguments);
				else
					socket[method].apply(socket, arguments);
			});
		}
		return this;
	};
});

WebSocketServerChannel.NO_WRAP = new Set(["connection", "disconnect", "error"]);

/* Define a WebSocketServerWrapper, which (in a weird way) is also a
	WebSocketServerChannel. */
class WebSocketServerWrapper extends WebSocketServerChannel {
	constructor(webSocketServer) {
		// This is a WebSocketServerChannel with `null` as the channel name
		super(null);
		/* Set a reference back to myself so that WebSocketServerChannel
			handlers work properly */
		this._wrapper = this;

		// Reference to actual WebSocketServer
		this.server = webSocketServer;
		// Set of connected WebSockets
		this.sockets = new Set();
		// Map of WebSocketServerChannels
		this.channels = {};

		// When a WebSocket connects to the server...
		this.server.on("connection", (socket) => {
			// Wrap the WebSocket
			socket = new WebSocketWrapper(socket);
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
