package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Packet struct {
	SourceID  int       `json:"sourceId"`
	TargetID  int       `json:"targetId"`
	Timestamp time.Time `json:"timestamp"` // Timestamp when the packet was sent
}

// Port represents a port on a node
type Port struct {
	TargetID   int    `json:"targetId"`
	PortNumber int    `json:"portNumber"`
	Status     string `json:"status"`
}

// Node represents a node in the STP
type Node struct {
	ID       int     `json:"id"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	RootID   int     `json:"rootId"`
	HopCount int     `json:"hopCount"`
	NextHop  int     `json:"nextHop"`
	Ports    []Port  `json:"ports"`
}

// Link represents a link between two nodes
type Link struct {
	SourceID int `json:"sourceId"`
	TargetID int `json:"targetId"`
}

// InitSTPData represents the data structure for the initSTP message
type InitSTPData struct {
	Nodes []Node `json:"nodes"`
	Links []Link `json:"links"`
}

// Message struct for incoming messages
type Message struct {
	Type string      `json:"type"`
	Data InitSTPData `json:"data"` // Use the InitSTPData struct
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin
	},
}

func handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error upgrading connection:", err)
		return
	}
	defer conn.Close()

	fmt.Println("Client connected")

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("Error reading message:", err)
			break
		}

		// Handle the message based on its type
		handleMessage(msg, conn)

		// Echo the message back (optional)
		err = conn.WriteMessage(messageType, msg)
		if err != nil {
			fmt.Println("Error writing message:", err)
			break
		}
	}
}

func handleMessage(msg []byte, conn *websocket.Conn) {
	var message Message
	if err := json.Unmarshal(msg, &message); err != nil {
		fmt.Println("Error unmarshalling message:", err)
		return
	}

	switch message.Type {
	case "initSTP":
		// Handle initSTP message
		fmt.Printf("Received initSTP message: %+v\n", message.Data)
		// Add your STP initialization logic here
		handleSTPInitialization(message.Data, conn)
	// Add additional cases for other message types
	default:
		fmt.Println("Unknown message type:", message.Type)
	}
}

func handleSTPInitialization(data InitSTPData, conn *websocket.Conn) {
	// Create a wait group to manage goroutines
	var wg sync.WaitGroup
	nodeChannels := make(map[int]chan Packet)

	// Create channels for each node
	for _, node := range data.Nodes {
		nodeChannels[node.ID] = make(chan Packet)
	}

	// Spawn goroutines for each node
	for _, node := range data.Nodes {
		wg.Add(1)
		go func(node Node) {
			defer wg.Done()
			// Use a for range loop to listen on the channel
			for packet := range nodeChannels[node.ID] {
				// Simulate packet processing
				fmt.Printf("Node %d received packet from %d\n", node.ID, packet.SourceID)
				time.Sleep(1 * time.Second) // Simulate processing time
				// Send packet to the appropriate ports
				for _, port := range node.Ports {
					if port.Status == "Unblocked" { // Assuming "Forwarding" is the status to send packets
						targetChannel := nodeChannels[port.TargetID]
						targetChannel <- Packet{
							SourceID:  node.ID,
							TargetID:  port.TargetID,
							Timestamp: time.Now(),
						}
					}
				}
			}
		}(node)
	}

	// Example of sending initial packets to simulate STP
	for _, node := range data.Nodes {
		go func(node Node) {
			// Send an initial packet for each node
			nodeChannels[node.ID] <- Packet{
				SourceID:  node.ID,
				TargetID:  node.ID, // Initial packet to itself
				Timestamp: time.Now(),
			}
		}(node)
	}

	// Wait for all goroutines to finish (this may never happen in a real STP simulation)
	wg.Wait()
}

func main() {
	http.HandleFunc("/ws", handleConnection)

	fmt.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("Error starting server:", err)
	}
}
