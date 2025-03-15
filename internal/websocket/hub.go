package websocket

import (
	"log"
	"sync"
)

type Hub struct {
	clients map[*Client]bool
	register chan *Client
	unregister chan *Client
	broadcast chan []byte

	mu sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*Client]bool),
		register: make(chan *Client),
		unregister: make(chan *Client),
		
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <- h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <- h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
		case msg := <- h.broadcast:
			log.Printf("Broadcast message: %s\n", string(msg))
		}
	}
}