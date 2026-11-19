// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/** Names each DevTools state tracked by `StateManager`. */
export var StateKind;
(function (StateKind) {
    StateKind["CPU_THROTTLING"] = "cpu-throttling";
    StateKind["CACHE_DISABLED"] = "cache-disabled";
    StateKind["JAVASCRIPT_DISABLED"] = "java-script-disabled";
})(StateKind || (StateKind = {}));
/** Events emitted by StateProvider and `StateManager` when a tracked state changes. */
export var Events;
(function (Events) {
    Events["STATE_CHANGED"] = "StateChanged";
})(Events || (Events = {}));
//# sourceMappingURL=State.js.map