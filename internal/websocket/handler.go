package websocket

import (
	"log"
	"net/http"

	ws "github.com/gorilla/websocket"
)

var upgrader = ws.Upgrader {
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// For now, do nothing
		return true
	},
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// Ignore sessions but do something like the following in the future
	// vars := mux.Vars(r)
	// sessionID := vars["sessionID"]

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Cannot upgrade connection\n")
		return
	}

	newClient := &Client {
		hub: hub,
		conn: conn,
		send: make(chan []byte),
		userID: "100000", // debug ID
		// session info later
	}

	newClient.hub.register <- newClient

	// register session as well

	go newClient.WritePump()
	go newClient.ReadPump()

	// Do some initialization for the client sims
	
}