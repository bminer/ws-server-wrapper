"use strict";
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
		// Set default options
		if(this.options.requestTimeout === undefined) {
			this.options.requestTimeout = 2 * 60 * 1000; // 2 minutes
		}
		if(this.options.heartbeatInterval === undefined) {
			this.options.heartbeatInterval = 60 * 1000; // 1 minute
		}

		// Reference to actual WebSocketServer
		this.server = webSocketServer;
		// Set of connected WebSockets
		this.sockets = new Set();
		// Map of WebSocketServerChannels
		this.channels = {};

		// When a WebSocket connects to the server...
		this.server.on("connection", (socket, req) => {
			// Set up heartbeat ("pong" listener) on raw socket, if needed
			if(this.options.heartbeatInterval > 0) {
				socket._pong = true;
				socket.on("pong", function() {
					// Note: `this` is the raw socket
					this._pong = true;
				});
			}
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
			this.emit("connection", socket, req);
		});
		// Emit errors
		this.server.on("error", (err) => {
			this.emit("error", err);
		});
		// Heartbeat (ping/pong) timer
		if(this.options.heartbeatInterval > 0) {
			this._heartbeatTimer = setInterval(() => {
				this.sockets.forEach((socket) => {
					// Unwrap to get the raw socket
					const raw = socket.socket;
					// Check to see if a "pong" has occurred since last heartbeat
					if(raw._pong) {
						raw._pong = false;
						raw.ping(() => {});
					} else {
						raw.terminate();
					}
				});
			}, this.options.heartbeatInterval);
		}
	}

	of(namespace) {
		if(!this.channels[namespace])
			this.channels[namespace] =
				new WebSocketServerChannel(namespace, this);
		return this.channels[namespace];
	}

	close() {
		if(this._heartbeatTimer) {
			clearInterval(this._heartbeatTimer);
			this._heartbeatTimer = null;
		}
		return this.server.close();
	}
}

module.exports = WebSocketServerWrapper;
