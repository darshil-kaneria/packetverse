package simulation

import "context"

type Engine interface {
	Run(ctx context.Context, config interface{}, resultChan chan []byte) error
	Stop() error
}

