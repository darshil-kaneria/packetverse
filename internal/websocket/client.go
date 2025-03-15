package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait = 10 * time.Second
	pongWait = 60 * time.Second
	pingPeriod = pongWait * 9 / 10
)

type Message struct {
	Type string `json:"type`
	Payload json.RawMessage `json:"payload"`
}

type Client struct {
	hub *Hub
	conn *websocket.Conn
	send chan []byte
	userID string
	sessionID string
	// session
	// timeline
}

func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
	return &Client{
		hub: hub,
		conn: conn,
		send: make(chan []byte),
		userID: userID,
		// session
		// timeline
	}
}

func (c *Client) ReadPump() {
	// Cleanup when the client exits
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
		// cleanup session as well
	}()

	// Set heartbeat for each connection
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Websocket error: %v\n", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <- c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			w.Write(message)

			// Currently testing with txt messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c Client) SendMessage(messageType string, data interface{}) {
	message := struct {
		Type string `json:"type"`
		Data interface{} `json:"data"`
	}{
		Type: messageType,
		Data: data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Couldn't marshal message: %v\n", message)
		return
	}

	select {
	case c.send <- jsonData:
		log.Printf("Sent: %v\n", jsonData)
	default:
		// Buffers could be full
		log.Printf("Couldn't send: %v\n", jsonData)
	}


}

func (c *Client) handleMessage(message []byte) {
	var msg Message
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Invalid message format: %v\n", message)
		return
	}

	switch msg.Type {
	case "test":
		c.handleTestMessage(msg.Payload)
	default:
		log.Printf("Message type unimplemented: %v\n", msg.Type)
	}
}

func (c *Client) handleTestMessage(message json.RawMessage) {
	log.Printf("Message received: %v\n", message)
}
