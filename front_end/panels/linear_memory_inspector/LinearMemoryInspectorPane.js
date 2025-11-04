// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as LinearMemoryInspectorComponents from './components/components.js';
import { LinearMemoryInspectorController } from './LinearMemoryInspectorController.js';
const UIStrings = {
    /**
     * @description Label in the Linear Memory inspector tool that serves as a placeholder if no inspections are open (i.e. nothing to see here).
     *             Inspection hereby refers to viewing, navigating and understanding the memory through this tool.
     */
    noOpenInspections: 'No open inspections',
    /**
     * @description Label in the Linear Memory inspector tool that serves as a placeholder if no inspections are open (i.e. nothing to see here).
     *             Inspection hereby refers to viewing, navigating and understanding the memory through this tool.
     */
    memoryInspectorExplanation: 'On this page you can inspect binary data.',
    /**
     * @description Label in the Linear Memory inspector tool for a link.
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/LinearMemoryInspectorPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inspectorInstance;
const MEMORY_INSPECTOR_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/memory-inspector';
export class LinearMemoryInspectorPane extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #tabbedPane;
    constructor() {
        super({ jslog: `${VisualLogging.panel('linear-memory-inspector').track({ resize: true })}` });
        this.#tabbedPane = new UI.TabbedPane.TabbedPane();
        this.#tabbedPane.setPlaceholderElement(this.createPlaceholder());
        this.#tabbedPane.setCloseableTabs(true);
        this.#tabbedPane.setAllowTabReorder(true, true);
        this.#tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this.#tabClosed, this);
        this.#tabbedPane.show(this.contentElement);
        this.#tabbedPane.headerElement().setAttribute('jslog', `${VisualLogging.toolbar().track({ keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space' })}`);
    }
    createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.classList.add('empty-state');
        placeholder.createChild('span', 'empty-state-header').textContent = i18nString(UIStrings.noOpenInspections);
        const description = placeholder.createChild('div', 'empty-state-description');
        description.createChild('span').textContent = i18nString(UIStrings.memoryInspectorExplanation);
        const link = UI.XLink.XLink.create(MEMORY_INSPECTOR_EXPLANATION_URL, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more');
        description.appendChild(link);
        return placeholder;
    }
    static instance() {
        if (!inspectorInstance) {
            inspectorInstance = new LinearMemoryInspectorPane();
        }
        return inspectorInstance;
    }
    #tabView(tabId) {
        const view = this.#tabbedPane.tabView(tabId);
        if (view === null) {
            throw new Error(`No linear memory inspector view for the given tab id: ${tabId}`);
        }
        return view;
    }
    create(tabId, title, arrayWrapper, address) {
        const inspectorView = new LinearMemoryInspectorView(arrayWrapper, address, tabId);
        this.#tabbedPane.appendTab(tabId, title, inspectorView, undefined, false, true);
        this.#tabbedPane.selectTab(tabId);
    }
    close(tabId) {
        this.#tabbedPane.closeTab(tabId, false);
    }
    reveal(tabId, address) {
        const view = this.#tabView(tabId);
        if (address !== undefined) {
            view.updateAddress(address);
        }
        this.refreshView(tabId);
        this.#tabbedPane.selectTab(tabId);
    }
    refreshView(tabId) {
        const view = this.#tabView(tabId);
        view.refreshData();
    }
    #tabClosed(event) {
        const { tabId } = event.data;
        this.dispatchEventToListeners("ViewClosed" /* Events.VIEW_CLOSED */, tabId);
    }
}
export class LinearMemoryInspectorView extends UI.Widget.VBox {
    #memoryWrapper;
    #memory;
    #offset = 0;
    #address;
    #tabId;
    #inspector;
    firstTimeOpen;
    #hideValueInspector;
    constructor(memoryWrapper, address = 0, tabId, hideValueInspector) {
        super();
        if (address < 0 || address >= memoryWrapper.length()) {
            throw new Error('Requested address is out of bounds.');
        }
        this.#memoryWrapper = memoryWrapper;
        this.#address = address;
        this.#tabId = tabId;
        this.#hideValueInspector = Boolean(hideValueInspector);
        this.firstTimeOpen = true;
        this.#inspector = new LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector();
        this.#inspector.addEventListener("MemoryRequest" /* LinearMemoryInspectorComponents.LinearMemoryInspector.Events.MEMORY_REQUEST */, this.#memoryRequested, this);
        this.#inspector.addEventListener("AddressChanged" /* LinearMemoryInspectorComponents.LinearMemoryInspector.Events.ADDRESS_CHANGED */, event => this.updateAddress(event.data));
        this.#inspector.addEventListener("SettingsChanged" /* LinearMemoryInspectorComponents.LinearMemoryInspector.Events.SETTINGS_CHANGED */, event => this.saveSettings(event.data));
        this.#inspector.addEventListener("DeleteMemoryHighlight" /* LinearMemoryInspectorComponents.LinearMemoryInspector.Events.DELETE_MEMORY_HIGHLIGHT */, event => {
            LinearMemoryInspectorController.instance().removeHighlight(this.#tabId, event.data);
            this.refreshData();
        });
        this.#inspector.show(this.contentElement);
    }
    render() {
        if (this.firstTimeOpen) {
            const settings = LinearMemoryInspectorController.instance().loadSettings();
            this.#inspector.valueTypes = settings.valueTypes;
            this.#inspector.valueTypeModes = settings.modes;
            this.#inspector.endianness = settings.endianness;
            this.firstTimeOpen = false;
        }
        if (!this.#memory) {
            return;
        }
        this.#inspector.memory = this.#memory;
        this.#inspector.memoryOffset = this.#offset;
        this.#inspector.address = this.#address;
        this.#inspector.outerMemoryLength = this.#memoryWrapper.length();
        this.#inspector.highlightInfo = this.#getHighlightInfo();
        this.#inspector.hideValueInspector = this.#hideValueInspector;
    }
    wasShown() {
        super.wasShown();
        this.refreshData();
    }
    saveSettings(settings) {
        LinearMemoryInspectorController.instance().saveSettings(settings);
    }
    updateAddress(address) {
        if (address < 0 || address >= this.#memoryWrapper.length()) {
            throw new Error('Requested address is out of bounds.');
        }
        this.#address = address;
    }
    refreshData() {
        void LinearMemoryInspectorController.getMemoryForAddress(this.#memoryWrapper, this.#address)
            .then(({ memory, offset }) => {
            this.#memory = memory;
            this.#offset = offset;
            this.render();
        });
    }
    #memoryRequested(event) {
        const { start, end, address } = event.data;
        if (address < start || address >= end) {
            throw new Error('Requested address is out of bounds.');
        }
        void LinearMemoryInspectorController.getMemoryRange(this.#memoryWrapper, start, end).then(memory => {
            this.#memory = memory;
            this.#offset = start;
            this.render();
        });
    }
    #getHighlightInfo() {
        const highlightInfo = LinearMemoryInspectorController.instance().getHighlightInfo(this.#tabId);
        if (highlightInfo !== undefined) {
            if (highlightInfo.startAddress < 0 || highlightInfo.startAddress >= this.#memoryWrapper.length()) {
                throw new Error('HighlightInfo start address is out of bounds.');
            }
            if (highlightInfo.size <= 0) {
                throw new Error('Highlight size must be a positive number.');
            }
        }
        return highlightInfo;
    }
}
//# sourceMappingURL=LinearMemoryInspectorPane.js.map