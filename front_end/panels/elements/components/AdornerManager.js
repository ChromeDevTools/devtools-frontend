// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export var RegisteredAdorners;
(function (RegisteredAdorners) {
    RegisteredAdorners["AD"] = "ad";
    RegisteredAdorners["CONTAINER"] = "container";
    RegisteredAdorners["FLEX"] = "flex";
    RegisteredAdorners["GRID"] = "grid";
    RegisteredAdorners["GRID_LANES"] = "grid-lanes";
    RegisteredAdorners["MEDIA"] = "media";
    RegisteredAdorners["POPOVER"] = "popover";
    RegisteredAdorners["REVEAL"] = "reveal";
    RegisteredAdorners["SCROLL"] = "scroll";
    RegisteredAdorners["SCROLL_SNAP"] = "scroll-snap";
    RegisteredAdorners["SLOT"] = "slot";
    RegisteredAdorners["VIEW_SOURCE"] = "view-source";
    RegisteredAdorners["STARTING_STYLE"] = "starting-style";
    RegisteredAdorners["SUBGRID"] = "subgrid";
    RegisteredAdorners["TOP_LAYER"] = "top-layer";
})(RegisteredAdorners || (RegisteredAdorners = {}));
export class AdornerManager {
    #adornerSettings = new Map();
    #settingStore;
    constructor(settingStore) {
        this.#settingStore = settingStore;
        this.#syncSettings();
    }
    updateSettings(settings) {
        this.#adornerSettings = settings;
        this.#persistCurrentSettings();
    }
    getSettings() {
        return this.#adornerSettings;
    }
    isAdornerEnabled(adornerText) {
        return this.#adornerSettings.get(adornerText) || false;
    }
    #persistCurrentSettings() {
        const settingList = [];
        for (const [adorner, isEnabled] of this.#adornerSettings) {
            settingList.push({ adorner, isEnabled });
        }
        this.#settingStore.set(settingList);
    }
    #loadSettings() {
        const settingList = this.#settingStore.get();
        for (const setting of settingList) {
            this.#adornerSettings.set(setting.adorner, setting.isEnabled);
        }
    }
    #syncSettings() {
        this.#loadSettings();
        // Prune outdated adorners and add new ones to the persistence.
        const outdatedAdorners = new Set(this.#adornerSettings.keys());
        for (const adorner of Object.values(RegisteredAdorners)) {
            outdatedAdorners.delete(adorner);
            if (!this.#adornerSettings.has(adorner)) {
                // Only the MEDIA adorner is disabled by default.
                const isEnabled = adorner !== RegisteredAdorners.MEDIA;
                this.#adornerSettings.set(adorner, isEnabled);
            }
        }
        for (const outdatedAdorner of outdatedAdorners) {
            this.#adornerSettings.delete(outdatedAdorner);
        }
        this.#persistCurrentSettings();
    }
}
//# sourceMappingURL=AdornerManager.js.map