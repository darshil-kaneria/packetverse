package main

import (
	"log"
	"net/http"
	"packetverse/internal/websocket"

	"github.com/gorilla/mux"
)

func main() {
	router := mux.NewRouter()
	hub := websocket.NewHub()

	go hub.Run()

	router.HandleFunc("/ws/{sessionID}", func(w http.ResponseWriter, r *http.Request) {
		// place holder for now
		websocket.ServeWs(hub, w, r)
	})

	router.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Test message")
	})

	log.Fatal(http.ListenAndServe(":8080", router))

}