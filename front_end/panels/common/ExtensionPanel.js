// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import { ExtensionNotifierView, ExtensionView } from './ExtensionView.js';
const { repeat, styleMap } = Directives;
const { widget, widgetRef } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <devtools-toolbar ?hidden=${input.toolbarItems.length === 0}>
      ${repeat(input.toolbarItems, item => item.id, item => html `
        <devtools-button
          class="toolbar-button toolbar-item"
          style=${styleMap({ backgroundImage: item.iconURL ? `url(${item.iconURL})` : undefined })}
          title=${item.tooltip}
          ?disabled=${item.disabled}
          .data=${{
        variant: "text" /* Buttons.Button.Variant.TEXT */,
        reducedFocusRing: true,
        title: item.tooltip,
        disabled: item.disabled,
    }}
          @click=${item.onClick}
        ></devtools-button>
      `)}
    </devtools-toolbar>
    <devtools-widget class="vbox flex-auto"
      ${widget(UI.SearchableView.SearchableView, { searchProvider: input.searchProvider })}
      ${widgetRef(UI.SearchableView.SearchableView, e => {
        output.searchableView = e;
    })}>
      ${widget(ExtensionView, {
        data: {
            server: input.server,
            id: input.id,
            src: input.pageURL,
            className: 'extension',
        },
    })}
    </devtools-widget>
  `, target);
    // clang-format on
};
export class ExtensionPanel extends UI.Panel.Panel {
    #server;
    #id;
    #pageURL;
    #toolbarItems = [];
    #view;
    #searchableView;
    constructor(server, panelName, id, pageURL, view = DEFAULT_VIEW) {
        super(panelName);
        this.#server = server;
        this.#id = id;
        this.#pageURL = pageURL;
        this.#view = view;
        this.setHideOnDetach();
        this.performUpdate();
    }
    performUpdate() {
        const output = {};
        this.#view({
            server: this.#server,
            id: this.#id,
            pageURL: this.#pageURL,
            searchProvider: this,
            toolbarItems: this.#toolbarItems.map(item => item.data()),
        }, output, this.element);
        if (output.searchableView) {
            this.#searchableView = output.searchableView;
        }
    }
    addToolbarItem(item) {
        item.setOnUpdate(() => this.requestUpdate());
        this.#toolbarItems.push(item);
        this.requestUpdate();
    }
    onSearchCanceled() {
        this.#server.notifySearchAction(this.#id, "cancelSearch" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch */);
        this.#searchableView?.updateSearchMatchesCount(0);
    }
    searchableView() {
        return this.#searchableView ?? null;
    }
    performSearch(searchConfig, _shouldJump, _jumpBackwards) {
        const query = searchConfig.query;
        this.#server.notifySearchAction(this.#id, "performSearch" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PerformSearch */, query);
    }
    supportsMatchCounts() {
        return false;
    }
    jumpToNextSearchResult() {
        this.#server.notifySearchAction(this.#id, "nextSearchResult" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.NextSearchResult */);
    }
    jumpToPreviousSearchResult() {
        this.#server.notifySearchAction(this.#id, "previousSearchResult" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PreviousSearchResult */);
    }
    supportsCaseSensitiveSearch() {
        return false;
    }
    supportsWholeWordSearch() {
        return false;
    }
    supportsRegexSearch() {
        return false;
    }
}
export class ExtensionButton {
    #id;
    #server;
    #iconURL = '';
    #tooltip = '';
    #disabled = false;
    #onUpdate;
    constructor(server, id, iconURL, tooltip, disabled) {
        this.#server = server;
        this.#id = id;
        this.update(iconURL, tooltip, disabled);
    }
    setOnUpdate(onUpdate) {
        this.#onUpdate = onUpdate;
    }
    update(iconURL, tooltip, disabled) {
        if (typeof iconURL === 'string') {
            this.#iconURL = iconURL;
        }
        if (typeof tooltip === 'string') {
            this.#tooltip = tooltip;
        }
        if (typeof disabled === 'boolean') {
            this.#disabled = disabled;
        }
        this.#onUpdate?.();
    }
    data() {
        return {
            id: this.#id,
            iconURL: this.#iconURL,
            tooltip: this.#tooltip,
            disabled: this.#disabled,
            onClick: () => {
                this.#server.notifyButtonClicked(this.#id);
            },
        };
    }
    toolbarButton() {
        return this;
    }
}
// Generates stable hash-based id usable as (part of) viewId for any unicode string.
const hashIdentifier = (id) => Platform.StringUtilities.hashCode(id).toString(36);
// Produces a stable identifier usable as (part of) viewId by either sanitizing it or hashing.
const cleanIdentifier = (id) => Platform.StringUtilities.sanitizeIdentifier(id) || hashIdentifier(id);
export class ExtensionSidebarPane extends UI.View.SimpleView {
    #panelName;
    server;
    #id;
    extensionView;
    objectPropertiesView;
    constructor(server, panelName, title, id, extensionId = 'extension') {
        const viewId = `extension-sidebar-${cleanIdentifier(extensionId)}-${cleanIdentifier(panelName)}-${hashIdentifier(title)}`;
        super({ title, viewId });
        this.element.classList.add('fill');
        this.#panelName = panelName;
        this.server = server;
        this.#id = id;
    }
    id() {
        return this.#id;
    }
    panelName() {
        return this.#panelName;
    }
    setObject(object, title, callback) {
        this.createObjectPropertiesView();
        this.#setObject(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
    }
    setExpression(expression, title, evaluateOptions, securityOrigin, callback) {
        this.createObjectPropertiesView();
        this.server.evaluate(expression, true, false, evaluateOptions, securityOrigin, this.onEvaluate.bind(this, title, callback));
    }
    setPage(url) {
        if (this.objectPropertiesView) {
            this.objectPropertiesView.detach();
            delete this.objectPropertiesView;
        }
        if (this.extensionView) {
            this.extensionView.detach(true);
        }
        this.extensionView = new ExtensionView();
        this.extensionView.data = { server: this.server, id: this.#id, src: url, className: 'extension fill' };
        this.extensionView.show(this.element);
        if (!this.element.style.height) {
            this.setHeight('150px');
        }
    }
    setHeight(height) {
        this.element.style.height = height;
    }
    onEvaluate(title, callback, error, result, _wasThrown) {
        if (error) {
            callback(error.toString());
        }
        else if (!result) {
            callback();
        }
        else {
            this.#setObject(result, title, callback);
        }
    }
    createObjectPropertiesView() {
        if (this.objectPropertiesView) {
            return;
        }
        if (this.extensionView) {
            this.extensionView.detach(true);
            delete this.extensionView;
        }
        this.objectPropertiesView = new ExtensionNotifierView();
        this.objectPropertiesView.data = { server: this.server, id: this.#id };
        this.objectPropertiesView.show(this.element);
    }
    #setObject(object, title, callback) {
        const objectPropertiesView = this.objectPropertiesView;
        // This may only happen if setPage() was called while we were evaluating the expression.
        if (!objectPropertiesView) {
            callback('operation cancelled');
            return;
        }
        objectPropertiesView.detachChildWidgets();
        const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget();
        section.objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
            readOnly: true,
            propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
        });
        section.objectTree.expanded = true;
        if (title) {
            const span = document.createElement('span');
            span.textContent = title;
            section.title = span;
        }
        section.show(objectPropertiesView.element);
        callback();
    }
}
//# sourceMappingURL=ExtensionPanel.js.map