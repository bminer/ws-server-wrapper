const EventEmitter = require("events").EventEmitter;

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

module.exports = WebSocketServerChannel;
