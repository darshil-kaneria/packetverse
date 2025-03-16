package store

import (
	"packetverse/internal/models"
	"sync"
)

type SessionStore struct {
	sessions map[string]*models.Session
	mu       sync.RWMutex
}

func NewSessionStore() *SessionStore {
	return &SessionStore{
		sessions: make(map[string]*models.Session),
	}
}

func (s *SessionStore) CreateSession(id string) *models.Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	session := models.NewSession(id)
	s.sessions[id] = session
	return session
}

func (s *SessionStore) GetSession(id string) (*models.Session, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, exists := s.sessions[id]
	return session, exists
}

func (s *SessionStore) RemoveSession(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.sessions, id)
}

func (s *SessionStore) SessionExists(id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, exists := s.sessions[id]

	return exists
}

func (s *SessionStore) GetAllSessions() []*models.Session {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]*models.Session, 0, len(s.sessions))
	for _, session := range s.sessions {
		sessions = append(sessions, session)
	}

	return sessions
}
