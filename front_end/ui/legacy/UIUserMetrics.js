// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
export class UIUserMetrics {
    #panelChangedSinceLaunch = false;
    #firedLaunchHistogram = false;
    #launchPanelName = '';
    static #instance = null;
    static instance() {
        if (!this.#instance) {
            this.#instance = new UIUserMetrics();
        }
        return this.#instance;
    }
    panelLoaded(panelName, histogramName) {
        if (this.#firedLaunchHistogram || panelName !== this.#launchPanelName) {
            return;
        }
        this.#firedLaunchHistogram = true;
        // Use rAF and setTimeout to ensure the marker is fired after layout and rendering.
        // This will give the most accurate representation of the tool being ready for a user.
        requestAnimationFrame(() => {
            setTimeout(() => {
                // Mark the load time so that we can pinpoint it more easily in a trace.
                performance.mark(histogramName);
                // If the user has switched panel before we finished loading, ignore the histogram,
                // since the launch timings will have been affected and are no longer valid.
                if (this.#panelChangedSinceLaunch) {
                    return;
                }
                // This fires the event for the appropriate launch histogram.
                // The duration is measured as the time elapsed since the time origin of the document.
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordPerformanceHistogram(histogramName, performance.now());
            }, 0);
        });
    }
    setLaunchPanel(panelName) {
        this.#launchPanelName = panelName;
    }
    performanceTraceLoad(measure) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.TraceLoad', measure.duration);
    }
    panelShown(panelName, isLaunching) {
        const code = Host.UserMetrics.PanelCodes[panelName] || 0;
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.PanelShown" /* Host.InspectorFrontendHostAPI.EnumeratedHistogram.PanelShown */, code, Host.UserMetrics.PanelCodes.MAX_VALUE);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordUserMetricsAction('DevTools_PanelShown_' + panelName);
        if (!isLaunching) {
            this.#panelChangedSinceLaunch = true;
        }
    }
    settingsPanelShown(settingsViewId) {
        this.panelShown('settings-' + settingsViewId);
    }
}
//# sourceMappingURL=UIUserMetrics.js.map