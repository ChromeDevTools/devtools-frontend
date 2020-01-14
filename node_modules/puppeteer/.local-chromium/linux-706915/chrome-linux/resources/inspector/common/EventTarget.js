export function removeEventListeners(eventList){for(const eventInfo of eventList){eventInfo.eventTarget.removeEventListener(eventInfo.eventType,eventInfo.listener,eventInfo.thisObject);}
eventList.splice(0);}
export default class EventTarget{addEventListener(eventType,listener,thisObject){}
once(eventType){}
removeEventListener(eventType,listener,thisObject){}
hasEventListeners(eventType){}
dispatchEventToListeners(eventType,eventData){}}
self.Common=self.Common||{};Common=Common||{};Common.Event;Common.EventTarget=EventTarget;EventTarget.removeEventListeners=removeEventListeners;Common.EventTarget.EventDescriptor;