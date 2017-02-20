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
		if(this.name == null && WebSocketServerChannel.NO_WRAP.has(eventName) ) {
			/* These events should not be wrapped, so we just pass through the
				emitter and do nothing else */
			this._emitter[method].apply(this._emitter, arguments);
		} else {
			/* These events can be wrapped, so we only save the listener in the
				global `_emitter`.  We don't emit through the `_emitter` here;
				rather, we would emit to connected sockets.
			*/
			if(method !== "emit")
				this._emitter[method].apply(this._emitter, arguments);
			// Pass event handling (including emitting) to all connected sockets
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
