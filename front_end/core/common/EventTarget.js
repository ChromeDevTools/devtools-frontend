// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function removeEventListeners(eventList) {
    for (const eventInfo of eventList) {
        eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.listener, eventInfo.thisObject);
    }
    // Do not hold references on unused event descriptors.
    eventList.splice(0);
}
export function fireEvent(name, detail = {}, target = window) {
    const evt = new CustomEvent(name, { bubbles: true, cancelable: true, detail });
    target.dispatchEvent(evt);
}
//# sourceMappingURL=EventTarget.js.map