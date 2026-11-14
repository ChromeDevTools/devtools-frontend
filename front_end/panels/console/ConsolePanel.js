// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ConsoleView } from './ConsoleView.js';
const { widget } = UI.Widget;
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    ${widget(UI.Widget.WrapperWidget, {
        widget: input.showConsoleView ? ConsoleView.instance() : null,
    })}
  `, target, {
        container: {
            attributes: {
                jslog: `${VisualLogging.panel('console').track({ resize: true })}`,
            },
        },
    });
    // clang-format on
};
let consolePanelInstance = null;
export class ConsolePanel extends UI.Panel.Panel {
    #view;
    #drawerWasMinimized = false;
    #ownsConsoleView = false;
    constructor(view = DEFAULT_VIEW) {
        super('console');
        this.#view = view;
    }
    performUpdate() {
        this.#view({ showConsoleView: this.#ownsConsoleView }, undefined, this.contentElement);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew, view } = opts;
        if (!consolePanelInstance || forceNew) {
            consolePanelInstance = new ConsolePanel(view);
        }
        return consolePanelInstance;
    }
    static removeInstance() {
        consolePanelInstance = null;
    }
    static updateContextFlavor() {
        const consoleView = ConsoleView.instance();
        UI.Context.Context.instance().setFlavor(ConsoleView, consoleView.isShowing() ? consoleView : null);
    }
    wasShown() {
        super.wasShown();
        const inspectorView = UI.InspectorView.InspectorView.instance();
        this.#drawerWasMinimized = inspectorView.isDrawerMinimized();
        const wrapper = wrapperViewInstance;
        // Always take the view away from the wrapper, even when the drawer is
        // minimized or hidden, so that only one of them owns the ConsoleView.
        wrapper?.hideViewInWrapper();
        if (wrapper?.isShowing()) {
            inspectorView.setDrawerMinimized(true);
        }
        this.#ownsConsoleView = true;
        this.performUpdate();
        ConsolePanel.updateContextFlavor();
    }
    willHide() {
        super.willHide();
        this.#ownsConsoleView = false;
        this.performUpdate();
        const inspectorView = UI.InspectorView.InspectorView.instance();
        // The minimized drawer has 0 height, and showing Console inside may set
        // Console's scrollTop to 0. Unminimize before calling show to avoid this.
        // Restore the previous minimized state afterwards.
        inspectorView.setDrawerMinimized(false);
        if (wrapperViewInstance) {
            wrapperViewInstance.showViewInWrapper();
        }
        if (this.#drawerWasMinimized) {
            inspectorView.setDrawerMinimized(true);
        }
        ConsolePanel.updateContextFlavor();
    }
    searchableView() {
        return ConsoleView.instance().searchableView();
    }
}
let wrapperViewInstance = null;
export class WrapperView extends UI.Widget.VBox {
    #view;
    #ownsConsoleView = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    performUpdate() {
        this.#view({ showConsoleView: this.#ownsConsoleView }, undefined, this.contentElement);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew, view } = opts;
        if (!wrapperViewInstance || forceNew) {
            wrapperViewInstance = new WrapperView(undefined, view);
        }
        return wrapperViewInstance;
    }
    static removeInstance() {
        wrapperViewInstance = null;
    }
    wasShown() {
        super.wasShown();
        if (!ConsolePanel.instance().isShowing()) {
            this.showViewInWrapper();
        }
        else {
            // Render with showConsoleView: false so the container jslog attribute is
            // still set on contentElement when ConsolePanel owns ConsoleView.
            this.performUpdate();
            UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
        }
        ConsolePanel.updateContextFlavor();
    }
    willHide() {
        super.willHide();
        ConsolePanel.updateContextFlavor();
    }
    showViewInWrapper() {
        this.#ownsConsoleView = true;
        // Update synchronously so ConsoleView is mounted before drawer minimize
        // state and ConsoleView context flavor are updated by callers.
        this.performUpdate();
    }
    hideViewInWrapper() {
        this.#ownsConsoleView = false;
        // Update synchronously so ConsoleView detaches before ConsolePanel claims it.
        this.performUpdate();
    }
    insertIntoPrompt(text) {
        ConsoleView.instance().insertIntoPrompt(text);
    }
}
export class ConsoleRevealer {
    async reveal(_object) {
        const consoleView = ConsoleView.instance();
        if (consoleView.isShowing()) {
            consoleView.focus();
            return;
        }
        await UI.ViewManager.ViewManager.instance().showView('console-view');
    }
}
//# sourceMappingURL=ConsolePanel.js.map