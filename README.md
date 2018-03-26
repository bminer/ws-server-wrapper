# ws-server-wrapper

Lightweight WebSocketServer wrapper lib using [ws-wrapper](https://github.com/bminer/ws-wrapper)
and [ws](https://github.com/websockets/ws) to wrap connected WebSockets.  The
only dependency is ws-wrapper itself.

## Install

```
npm install ws-server-wrapper
```

## Usage

See [ws-wrapper](https://github.com/bminer/ws-wrapper) README or the API
documentation below for more details.

Quick Server-side Example:

Use [ws-server-wrapper](https://github.com/bminer/ws-server-wrapper) to wrap
the [WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver):

```javascript
const WebSocketServer = require("ws").Server
	, WebSocketServerWrapper = require("ws-server-wrapper");
var wss = new WebSocketServer({port: 3000});
var serverWrapper = new WebSocketServerWrapper(wss);
// Send "msg" event to all connected clients
serverWrapper.emit("msg", "Hello!");
// For all connected clients, listen for the "ping" request on the channel "pointless"
serverWrapper.of("pointless").on("ping", function() {
  // `this` refers to the "pointless" channel for the socket who sent the "ping" request
  // Let's just respond to the request with the value "pong"
  return "pong";
});
```

## API

Class: WebSocketServerWrapper

A WebSocketServerWrapper simply wraps around a
[WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver)
to give you well-deserved functionality. :)

`server = new WebSocketServerWrapper(webSocketServerInstance[, options]);`

Constructs a new WebSocketServerWrapper, and binds it to the native
WebSocketServer instance from [ws](https://github.com/websockets/ws).

- `webSocketServerInstance` - the native WebSocketServer instance
- `options` - options passed to each WebSocketWrapper constructor when a
	WebSocket connects.  See [the ws-wrapper API](https://github.com/bminer/ws-wrapper/#api)
	for details.

Events

- Event: "connection" - Emitted when a WebSocket connects to the WebSocketServer
	- `socket` - A WebSocketWrapper instance, wrapping a native WebSocket
	- `request` - A [http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
		instance.
- Event: "disconnect" - Emitted when a WebSocket disconnects from the WebSocketServer
	- `socket` - A WebSocketWrapper instance, wrapping a native WebSocket
- Event: "error" - Emitted when an error occurs on the WebSocketServer
	- `err`

The EventEmitter-like API looks like this:

See the [ws-wrapper API documentation](https://github.com/bminer/ws-wrapper/#api)
for more details.

- `server.on(eventName, listener)`
	Adds the `listener` function to the end of the listeners array for the
	event named `eventName` for all connected sockets, now and in the future.
	When an event or request matching the `eventName` is received by any
	connected WebSocket, the `listener` is called.

	Values returned by the `listener` callback are used to respond to
	requests.  If the return value of the `listener` is a `Promise`, the
	response to the request will be sent once the Promise is resolved or
	rejected; otherwise, the return value of the `listener` is sent back to
	the remote end immediately.

	If the inbound message is a simple event (not a request), the return
	value of the `listener` is ignored.
- `server.removeListener(eventName, listener)`
	Removes the specified `listener` from the listener array for the event
	named `eventName`.
- `server.removeAllListeners([eventName])`
	Removes all listeners, or those of the specified `eventName`.
- `server.eventNames()`
	Returns an array listing the events for which the emitter has registered
	listeners.
- `server.listeners(eventName)`
	Returns a copy of the array of listeners for the event named `eventName`.
- `server.emit(eventName[, ...args])`
	Sends an event to all connected WebSockets with the specified `eventName`
  calling all listeners for `eventName` on the remote end, in the order they were
	registered, passing the supplied arguments to each.

**Note:** `server.once()`  and `server.request()` are not supported at this time.

Channel API:
- `server.of(channelName)`
 	Returns the channel with the specified `channelName`.  Every channel has the
 	same EventEmitter-like API as described above for sending and handling
 	channel-specific events for all connected sockets.

Other methods and properties:

- `server.sockets` - A [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
  of connected WebSocketWrappers.
- `server.close()`
	Closes the native WebSocketServer
