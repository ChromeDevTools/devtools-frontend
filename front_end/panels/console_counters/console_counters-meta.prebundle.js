// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
let loadedConsoleCountersModule;
async function loadConsoleCountersModule() {
    if (!loadedConsoleCountersModule) {
        loadedConsoleCountersModule = await import('./console_counters.js');
    }
    return loadedConsoleCountersModule;
}
UI.Toolbar.registerToolbarItem({
    async loadItem() {
        const ConsoleCounters = await loadConsoleCountersModule();
        return ConsoleCounters.WarningErrorCounter.WarningErrorCounter.instance();
    },
    order: 1,
    location: "main-toolbar-right" /* UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT */,
});
//# sourceMappingURL=console_counters-meta.prebundle.js.map