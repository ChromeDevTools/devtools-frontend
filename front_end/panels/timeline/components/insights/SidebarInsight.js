// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class InsightActivated extends Event {
    model;
    insightSetKey;
    static eventName = 'insightactivated';
    constructor(model, insightSetKey) {
        super(InsightActivated.eventName, { bubbles: true, composed: true });
        this.model = model;
        this.insightSetKey = insightSetKey;
    }
}
export class InsightDeactivated extends Event {
    static eventName = 'insightdeactivated';
    constructor() {
        super(InsightDeactivated.eventName, { bubbles: true, composed: true });
    }
}
export class InsightSetHovered extends Event {
    bounds;
    static eventName = 'insightsethovered';
    constructor(bounds) {
        super(InsightSetHovered.eventName, { bubbles: true, composed: true });
        this.bounds = bounds;
    }
}
export class InsightSetZoom extends Event {
    bounds;
    static eventName = 'insightsetzoom';
    constructor(bounds) {
        super(InsightSetZoom.eventName, { bubbles: true, composed: true });
        this.bounds = bounds;
    }
}
export class InsightProvideOverlays extends Event {
    overlays;
    options;
    static eventName = 'insightprovideoverlays';
    constructor(overlays, options) {
        super(InsightProvideOverlays.eventName, { bubbles: true, composed: true });
        this.overlays = overlays;
        this.options = options;
    }
}
//# sourceMappingURL=SidebarInsight.js.map