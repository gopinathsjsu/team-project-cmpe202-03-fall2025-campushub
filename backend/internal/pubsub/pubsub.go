package pubsub

import (
	"sync"
)

// Message represents a pub/sub message
type Message struct {
	Topic   string
	Payload interface{}
}

// Bus is an in-memory pub/sub event bus
type Bus struct {
	mu          sync.RWMutex
	subscribers map[string][]chan Message
}

// New creates a new pub/sub bus
func New() *Bus {
	return &Bus{
		subscribers: make(map[string][]chan Message),
	}
}

// Subscribe returns a channel that receives messages for the given topic
func (b *Bus) Subscribe(topic string) chan Message {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan Message, 100) // buffered to prevent blocking
	b.subscribers[topic] = append(b.subscribers[topic], ch)
	return ch
}

// Publish sends a message to all subscribers of the topic
func (b *Bus) Publish(topic string, payload interface{}) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	msg := Message{
		Topic:   topic,
		Payload: payload,
	}

	for _, ch := range b.subscribers[topic] {
		select {
		case ch <- msg:
		default:
			// Skip if channel is full (non-blocking)
		}
	}
}

// Unsubscribe removes a subscriber channel for a topic
func (b *Bus) Unsubscribe(topic string, ch chan Message) {
	b.mu.Lock()
	defer b.mu.Unlock()

	subs := b.subscribers[topic]
	for i, sub := range subs {
		if sub == ch {
			b.subscribers[topic] = append(subs[:i], subs[i+1:]...)
			close(ch)
			break
		}
	}
}




