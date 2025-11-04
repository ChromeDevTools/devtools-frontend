// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
const UIStrings = {
    /**
     * @description Text to refresh the page
     */
    refresh: 'Refresh',
    /**
     * @description Text to clear everything
     */
    clearAll: 'Clear All',
    /**
     * @description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
     */
    deleteSelected: 'Delete Selected',
    /**
     * @description Text that informs screen reader users that the storage table has been refreshed
     */
    refreshedStatus: 'Table refreshed',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/StorageItemsToolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html, render } = Lit;
export const DEFAULT_VIEW = (input, _output, target) => {
    render(
    // clang-format off
    html `
      <devtools-toolbar class="top-resources-toolbar"
                        jslog=${VisualLogging.toolbar()}>
        <devtools-button title=${i18nString(UIStrings.refresh)}
                         jslog=${VisualLogging.action('storage-items-view.refresh').track({
        click: true
    })}
                         @click=${input.onRefresh}
                         .iconName=${'refresh'}
                         .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}></devtools-button>
        <devtools-toolbar-input type="filter"
                                ?disabled=${!input.filterItemEnabled}
                                @change=${input.onFilterChanged}
                                style="flex-grow:0.4"></devtools-toolbar-input>
        ${new UI.Toolbar.ToolbarSeparator().element}
        <devtools-button title=${input.deleteAllButtonTitle}
                         @click=${input.onDeleteAll}
                         id=storage-items-delete-all
                         ?disabled=${!input.deleteAllButtonEnabled}
                         jslog=${VisualLogging.action('storage-items-view.clear-all').track({
        click: true
    })}
                         .iconName=${input.deleteAllButtonIconName}
                         .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}></devtools-button>
        <devtools-button title=${i18nString(UIStrings.deleteSelected)}
                         @click=${input.onDeleteSelected}
                         ?disabled=${!input.deleteSelectedButtonDisabled}
                         jslog=${VisualLogging.action('storage-items-view.delete-selected').track({
        click: true
    })}
                         .iconName=${'cross'}
                         .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}></devtools-button>
        ${input.mainToolbarItems.map(item => item.element)}
      </devtools-toolbar>
      ${input.metadataView}`, 
    // clang-format on
    target);
};
export class StorageItemsToolbar extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    filterRegex;
    #metadataView;
    #view;
    #deleteAllButtonEnabled = true;
    #deleteSelectedButtonDisabled = true;
    #filterItemEnabled = true;
    #deleteAllButtonIconName = 'clear';
    #deleteAllButtonTitle = i18nString(UIStrings.clearAll);
    #mainToolbarItems = [];
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.filterRegex = null;
    }
    set metadataView(view) {
        this.#metadataView = view;
    }
    get metadataView() {
        if (!this.#metadataView) {
            this.#metadataView = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
        }
        return this.#metadataView;
    }
    performUpdate() {
        const viewInput = {
            deleteAllButtonEnabled: this.#deleteAllButtonEnabled,
            deleteSelectedButtonDisabled: this.#deleteSelectedButtonDisabled,
            filterItemEnabled: this.#filterItemEnabled,
            deleteAllButtonIconName: this.#deleteAllButtonIconName,
            deleteAllButtonTitle: this.#deleteAllButtonTitle,
            mainToolbarItems: this.#mainToolbarItems,
            metadataView: this.metadataView,
            onFilterChanged: this.filterChanged.bind(this),
            onRefresh: () => {
                this.dispatchEventToListeners("Refresh" /* StorageItemsToolbar.Events.REFRESH */);
                UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.refreshedStatus));
            },
            onDeleteAll: () => this.dispatchEventToListeners("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */),
            onDeleteSelected: () => this.dispatchEventToListeners("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */),
        };
        this.#view(viewInput, {}, this.contentElement);
    }
    setDeleteAllTitle(title) {
        this.#deleteAllButtonTitle = title;
        this.requestUpdate();
    }
    setDeleteAllGlyph(glyph) {
        this.#deleteAllButtonIconName = glyph;
        this.requestUpdate();
    }
    appendToolbarItem(item) {
        this.#mainToolbarItems.push(item);
        this.requestUpdate();
    }
    setStorageKey(storageKey) {
        this.metadataView.setStorageKey(storageKey);
    }
    filterChanged({ detail: text }) {
        this.filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i') : null;
        this.dispatchEventToListeners("Refresh" /* StorageItemsToolbar.Events.REFRESH */);
    }
    hasFilter() {
        return Boolean(this.filterRegex);
    }
    setCanDeleteAll(enabled) {
        this.#deleteAllButtonEnabled = enabled;
        this.requestUpdate();
    }
    setCanDeleteSelected(enabled) {
        this.#deleteSelectedButtonDisabled = enabled;
        this.requestUpdate();
    }
    setCanFilter(enabled) {
        this.#filterItemEnabled = enabled;
        this.requestUpdate();
    }
}
//# sourceMappingURL=StorageItemsToolbar.js.map