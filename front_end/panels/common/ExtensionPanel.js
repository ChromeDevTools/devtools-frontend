// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
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
export class ExtensionSidebarPane extends UI.View.SimpleView {
    #panelName;
    server;
    #id;
    extensionView;
    objectPropertiesView;
    constructor(server, panelName, title, id) {
        // For backwards compatibility we use the Kebab case version of the `title`
        // as `viewId` for sidebar panes created by extensions.
        const viewId = Platform.StringUtilities.toKebabCase(title);
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
        objectPropertiesView.element.removeChildren();
        void UI.UIUtils.Renderer.render(object, { title, editable: false, expand: true }).then(result => {
            if (!result) {
                callback();
                return;
            }
            objectPropertiesView.element.appendChild(result.element);
            callback();
        });
    }
}
//# sourceMappingURL=ExtensionPanel.js.map