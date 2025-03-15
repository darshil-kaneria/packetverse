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
		broadcast: make(chan []byte),
		
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
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- msg:
				default:
					// The client buffer is full
					// For now, we will simply close the channel
					// and remove the client
					h.mu.RUnlock()
					h.mu.Lock()
					close(client.send)
					delete(h.clients, client)
					h.mu.Unlock()
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}