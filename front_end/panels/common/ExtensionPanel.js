// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
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
export const SIDEBAR_PANE_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    ${input.pageURL ? widget(ExtensionView, {
        data: {
            server: input.server,
            id: input.id,
            src: input.pageURL,
            className: 'extension fill',
        },
    }) : input.showObjectProperties ? html `
      <devtools-widget ${widget(ExtensionNotifierView, {
        data: {
            server: input.server,
            id: input.id,
        },
    })} ${widgetRef(ExtensionNotifierView, () => { })}>
        ${input.objectTree ? html `<devtools-widget
          ${widget(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, {
        objectTree: input.objectTree,
        title: input.objectTitle ? html `<span>${input.objectTitle}</span>` : undefined,
    })}
          ${widgetRef(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, () => { })}
        ></devtools-widget>` : nothing}
      </devtools-widget>
    ` : nothing}
  `, target, {
        container: {
            classes: ['fill'],
            attributes: {
                style: input.height ? `height: ${input.height}` : undefined,
            },
        },
    });
    // clang-format on
};
export class ExtensionSidebarPane extends UI.View.SimpleView {
    #panelName;
    #server;
    #id;
    #view;
    #pageURL;
    #height;
    #showObjectProperties = false;
    #objectTree;
    #objectTitle;
    constructor(server, panelName, title, id, extensionId = 'extension', view = SIDEBAR_PANE_DEFAULT_VIEW) {
        const viewId = `extension-sidebar-${cleanIdentifier(extensionId)}-${cleanIdentifier(panelName)}-${hashIdentifier(title)}`;
        super({ title, viewId });
        this.#panelName = panelName;
        this.#server = server;
        this.#id = id;
        this.#view = view;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            server: this.#server,
            id: this.#id,
            pageURL: this.#pageURL,
            height: this.#height,
            showObjectProperties: this.#showObjectProperties,
            objectTree: this.#objectTree,
            objectTitle: this.#objectTitle,
        }, undefined, this.element);
    }
    id() {
        return this.#id;
    }
    panelName() {
        return this.#panelName;
    }
    setObject(object, title, callback) {
        this.#pageURL = undefined;
        this.#showObjectProperties = true;
        this.#setObject(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
    }
    setExpression(expression, title, evaluateOptions, securityOrigin, callback) {
        this.#createObjectPropertiesView();
        this.#server.evaluate(expression, true, false, evaluateOptions, securityOrigin, this.#onEvaluate.bind(this, title, callback));
    }
    setPage(url) {
        this.#showObjectProperties = false;
        this.#objectTree = undefined;
        this.#objectTitle = undefined;
        this.#pageURL = url;
        if (!this.#height) {
            this.#height = '150px';
        }
        this.requestUpdate();
    }
    setHeight(height) {
        if (this.#height === height) {
            return;
        }
        this.#height = height;
        this.requestUpdate();
    }
    #onEvaluate(title, callback, error, result, _wasThrown) {
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
    #createObjectPropertiesView() {
        if (this.#showObjectProperties) {
            return;
        }
        this.#pageURL = undefined;
        this.#objectTree = undefined;
        this.#objectTitle = undefined;
        this.#showObjectProperties = true;
        this.requestUpdate();
    }
    #setObject(object, title, callback) {
        // This may only happen if setPage() was called while we were evaluating the expression.
        if (!this.#showObjectProperties) {
            callback('operation cancelled');
            return;
        }
        const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
            readOnly: true,
            propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
        });
        objectTree.expanded = true;
        this.#objectTree = objectTree;
        this.#objectTitle = title;
        this.requestUpdate();
        void this.updateComplete.then(() => UI.Widget.Widget.allUpdatesComplete).then(() => {
            callback();
        });
    }
}
//# sourceMappingURL=ExtensionPanel.js.map