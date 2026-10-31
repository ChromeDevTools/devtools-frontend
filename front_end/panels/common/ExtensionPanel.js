// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ExtensionNotifierView, ExtensionView } from './ExtensionView.js';
export class ExtensionPanel extends UI.Panel.Panel {
    server;
    id;
    panelToolbar;
    #searchableView;
    constructor(server, panelName, id, pageURL) {
        super(panelName);
        this.server = server;
        this.id = id;
        this.setHideOnDetach();
        this.panelToolbar = this.element.createChild('devtools-toolbar', 'hidden');
        this.#searchableView = new UI.SearchableView.SearchableView(this, null);
        this.#searchableView.show(this.element);
        const extensionView = new ExtensionView(server, this.id, pageURL, 'extension');
        extensionView.show(this.#searchableView.element);
    }
    addToolbarItem(item) {
        this.panelToolbar.classList.remove('hidden');
        this.panelToolbar.appendToolbarItem(item);
    }
    onSearchCanceled() {
        this.server.notifySearchAction(this.id, "cancelSearch" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch */);
        this.#searchableView.updateSearchMatchesCount(0);
    }
    searchableView() {
        return this.#searchableView;
    }
    performSearch(searchConfig, _shouldJump, _jumpBackwards) {
        const query = searchConfig.query;
        this.server.notifySearchAction(this.id, "performSearch" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PerformSearch */, query);
    }
    supportsMatchCounts() {
        return false;
    }
    jumpToNextSearchResult() {
        this.server.notifySearchAction(this.id, "nextSearchResult" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.NextSearchResult */);
    }
    jumpToPreviousSearchResult() {
        this.server.notifySearchAction(this.id, "previousSearchResult" /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PreviousSearchResult */);
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
    id;
    #toolbarButton;
    constructor(server, id, iconURL, tooltip, disabled) {
        this.id = id;
        this.#toolbarButton = new UI.Toolbar.ToolbarButton('', '');
        this.#toolbarButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, server.notifyButtonClicked.bind(server, this.id));
        this.update(iconURL, tooltip, disabled);
    }
    update(iconURL, tooltip, disabled) {
        if (typeof iconURL === 'string') {
            this.#toolbarButton.setBackgroundImage(iconURL);
        }
        if (typeof tooltip === 'string') {
            this.#toolbarButton.setTitle(tooltip);
        }
        if (typeof disabled === 'boolean') {
            this.#toolbarButton.setEnabled(!disabled);
        }
    }
    toolbarButton() {
        return this.#toolbarButton;
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
        this.extensionView = new ExtensionView(this.server, this.#id, url, 'extension fill');
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
        this.objectPropertiesView = new ExtensionNotifierView(this.server, this.#id);
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