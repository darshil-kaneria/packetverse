package models

import (
	"context"
	"packetverse/internal/simulation"
	"sync"
	"time"
)

type SimulationState int

const (
	STOPPED SimulationState = iota
	RUNNING
	PAUSED
)

type SimulationType int

const (
	STP SimulationType = iota
	TCP
	BGP
	OSPF
	MIXNET
)

type Session struct {
	ID          string                         `json:"id"`
	CreatedAt   time.Time                      `json:"created_at"`
	LastActive  time.Time                      `json:"last_active"`
	Simulations map[string]*SimulationInstance `json:"simulations"`
	mu          sync.RWMutex
}

type SimulationInstance struct {
	ID         string                 `json:"id"`
	Type       SimulationType         `json:"type"`
	CreatedAt  time.Time              `json:"created_at"`
	LastActive time.Time              `json:"last_active"`
	Config     map[string]interface{} `json:"config"`
	State      SimulationState        `json:"state"`

	// These fields don't need to be serialized
	Engine        simulation.Engine  `json:"-"`
	ResultChannel chan []byte        `json:"-"`
	CancelFunc    context.CancelFunc `json:"-"`
}

func NewSession(id string) *Session {
	return &Session{
		ID:          id,
		CreatedAt:   time.Now(),
		LastActive:  time.Now(),
		Simulations: make(map[string]*SimulationInstance),
	}
}

// TODO: This is just a skeleton, will be filling it later
func (s *Session) AddSimulation(sim *SimulationInstance) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.Simulations[sim.ID] = sim
	s.LastActive = time.Now()
}

func (s *Session) GetSimulation(id string) (*SimulationInstance, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sim, exists := s.Simulations[id]
	return sim, exists
}

func (s *Session) RemoveSimulation(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.Simulations, id)
	s.LastActive = time.Now()
}

func (s *Session) GetAllSimulations() []*SimulationInstance {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sims := make([]*SimulationInstance, 0, len(s.Simulations))
	for _, sim := range s.Simulations {
		sims = append(sims, sim)
	}

	return sims
}

func (s *Session) UpdateLastActive() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastActive = time.Now()
}

func NewSimulationInstance(id string, simType SimulationType, config map[string]interface{}, engine simulation.Engine) *SimulationInstance {
	return &SimulationInstance{
		ID:            id,
		Type:          simType,
		CreatedAt:     time.Now(),
		LastActive:    time.Now(),
		Config:        config,
		State:         STOPPED,
		Engine:        engine,
		ResultChannel: make(chan []byte, 100),
	}
}
