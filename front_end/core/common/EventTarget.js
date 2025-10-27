"use strict";
export function removeEventListeners(eventList) {
  for (const eventInfo of eventList) {
    eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.listener, eventInfo.thisObject);
  }
  eventList.splice(0);
}
export function fireEvent(name, detail = {}, target = window) {
  const evt = new CustomEvent(name, { bubbles: true, cancelable: true, detail });
  target.dispatchEvent(evt);
}
//# sourceMappingURL=EventTarget.js.map
