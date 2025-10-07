import * as events from './web'

type EventConstructor = typeof events.Event
type EventTargetConstructor = typeof events.EventTarget

declare global {
  type Event = events.Event
  type EventTarget = events.EventTarget

  const Event: EventConstructor
  const EventTarget: EventTargetConstructor
}
