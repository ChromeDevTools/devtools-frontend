// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api,@devtools/no-lit-render-outside-of-view */
/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) IBM Corp. 2009  All rights reserved.
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectPropertiesSectionStyles from '../../ui/legacy/components/object_ui/objectPropertiesSection.css.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestPayloadTreeStyles from './requestPayloadTree.css.js';
import requestPayloadViewStyles from './requestPayloadView.css.js';
import { ShowMoreDetailsWidget } from './ShowMoreDetailsWidget.js';
const { classMap } = Directives;
const { widgetConfig } = UI.Widget;
const UIStrings = {
    /**
     * @description A context menu item Payload View of the Network panel to copy a parsed value.
     */
    copyValue: 'Copy value',
    /**
     * @description A context menu item Payload View of the Network panel to copy the payload.
     */
    copyPayload: 'Copy',
    /**
     * @description Text in Request Payload View of the Network panel. This is a noun-phrase meaning the
     * payload of a network request.
     */
    requestPayload: 'Request Payload',
    /**
     * @description Text in Request Payload View of the Network panel
     */
    unableToDecodeValue: '(unable to decode value)',
    /**
     * @description Text in Request Payload View of the Network panel
     */
    queryStringParameters: 'Query String Parameters',
    /**
     * @description Text in Request Payload View of the Network panel
     */
    formData: 'Form Data',
    /**
     * @description Text for toggling the view of payload data (e.g. query string parameters) from source to parsed in the payload tab
     */
    viewParsed: 'View parsed',
    /**
     * @description Text to show an item is empty
     */
    empty: '(empty)',
    /**
     * @description Text for toggling the view of payload data (e.g. query string parameters) from parsed to source in the payload tab
     */
    viewSource: 'View source',
    /**
     * @description Text for toggling payload data (e.g. query string parameters) from decoded to
     * encoded in the payload tab or in the cookies preview. URL-encoded is a different data format for
     * the same data, which the user sees when they click this command.
     */
    viewUrlEncoded: 'View URL-encoded',
    /**
     * @description Text for toggling payload data (e.g. query string parameters) from encoded to decoded in the payload tab or in the cookies preview
     */
    viewDecoded: 'View decoded',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestPayloadView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestPayloadView extends UI.Widget.VBox {
    request;
    decodeRequestParameters;
    queryStringCategory;
    formDataCategory;
    requestPayloadCategory;
    constructor(request) {
        super({ jslog: `${VisualLogging.pane('payload').track({ resize: true })}` });
        this.registerRequiredCSS(requestPayloadViewStyles);
        this.element.classList.add('request-payload-view');
        this.request = request;
        this.decodeRequestParameters = true;
        const contentType = request.requestContentType();
        if (contentType) {
            this.decodeRequestParameters = Boolean(contentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i));
        }
        const root = new UI.TreeOutline.TreeOutlineInShadow();
        root.registerRequiredCSS(objectValueStyles, objectPropertiesSectionStyles, requestPayloadTreeStyles);
        root.element.classList.add('request-payload-tree');
        root.setDense(true);
        this.element.appendChild(root.element);
        this.queryStringCategory = new Category(root, 'query-string');
        this.formDataCategory = new Category(root, 'form-data');
        this.requestPayloadCategory = new Category(root, 'request-payload');
    }
    wasShown() {
        super.wasShown();
        this.request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshFormData, this);
        this.refreshQueryString();
        void this.refreshFormData();
        // this._root.select(/* omitFocus */ true, /* selectedByUser */ false);
    }
    willHide() {
        super.willHide();
        this.request.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshFormData, this);
    }
    addEntryContextMenuHandler(treeElement, menuItem, jslogContext, getValue) {
        treeElement.listItemElement.addEventListener('contextmenu', event => {
            event.consume(true);
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            const copyValueHandler = () => {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(getValue());
            };
            contextMenu.clipboardSection().appendItem(menuItem, copyValueHandler, { jslogContext });
            void contextMenu.show();
        });
    }
    refreshQueryString() {
        const queryString = this.request.queryString();
        const queryParameters = this.request.queryParameters;
        this.queryStringCategory.hidden = !queryParameters;
        if (queryParameters) {
            this.refreshParams(i18nString(UIStrings.queryStringParameters), queryParameters, queryString, this.queryStringCategory);
        }
    }
    async refreshFormData() {
        const formData = await this.request.requestFormData();
        if (!formData) {
            this.formDataCategory.hidden = true;
            this.requestPayloadCategory.hidden = true;
            return;
        }
        const formParameters = await this.request.formParameters();
        if (formParameters) {
            this.formDataCategory.hidden = false;
            this.requestPayloadCategory.hidden = true;
            this.refreshParams(i18nString(UIStrings.formData), formParameters, formData, this.formDataCategory);
        }
        else {
            this.requestPayloadCategory.hidden = false;
            this.formDataCategory.hidden = true;
            try {
                const json = JSON.parse(formData);
                this.refreshRequestJSONPayload(json, formData);
            }
            catch {
                this.populateTreeElementWithSourceText(this.requestPayloadCategory, formData);
            }
        }
    }
    populateTreeElementWithSourceText(treeElement, text) {
        const sourceTreeElement = new UI.TreeOutline.TreeElement();
        treeElement.removeChildren();
        treeElement.appendChild(sourceTreeElement);
        this.addEntryContextMenuHandler(sourceTreeElement, i18nString(UIStrings.copyPayload), 'copy-payload', () => text);
        render(html `<devtools-widget class='payload-value source-code'
           .widgetConfig=${widgetConfig(ShowMoreDetailsWidget, { text })}></devtools-widget>`, sourceTreeElement.listItemElement);
    }
    refreshParams(title, params, sourceText, paramsTreeElement) {
        const viewParsed = function (event) {
            paramsTreeElement.listItemElement.removeEventListener('contextmenu', viewParsedContextMenu);
            viewSourceForItems.delete(paramsTreeElement);
            this.refreshParams(title, params, sourceText, paramsTreeElement);
            event.consume();
        };
        const viewParsedContextMenu = (event) => {
            if (!paramsTreeElement.expanded) {
                return;
            }
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            contextMenu.newSection().appendItem(i18nString(UIStrings.viewParsed), viewParsed.bind(this, event), { jslogContext: 'view-parsed' });
            void contextMenu.show();
        };
        const viewSource = function (event) {
            paramsTreeElement.listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);
            viewSourceForItems.add(paramsTreeElement);
            this.refreshParams(title, params, sourceText, paramsTreeElement);
            event.consume();
        };
        const toggleURLDecoding = function (event) {
            paramsTreeElement.listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);
            this.toggleURLDecoding(event);
        };
        const viewSourceContextMenu = (event) => {
            if (!paramsTreeElement.expanded) {
                return;
            }
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            const section = contextMenu.newSection();
            section.appendItem(i18nString(UIStrings.viewSource), viewSource.bind(this, event), { jslogContext: 'view-source' });
            const viewURLEncodedText = this.decodeRequestParameters ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded);
            section.appendItem(viewURLEncodedText, toggleURLDecoding.bind(this, event), { jslogContext: 'toggle-url-decoding' });
            void contextMenu.show();
        };
        const count = `\xA0(${params?.length ?? 0})`;
        const shouldViewSource = viewSourceForItems.has(paramsTreeElement);
        render(html `<div class="selection fill"></div>${title}<span class=payload-count>${count}</span>${shouldViewSource ? this.createViewSourceToggle(/* viewSource */ true, viewParsed.bind(this)) :
            html `${this.createViewSourceToggle(/* viewSource */ false, viewSource.bind(this))}
      <devtools-button
        class=payload-toggle
        jslogi=${VisualLogging.action().track({ click: true }).context('decode-encode')}
        .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
        @click=${toggleURLDecoding.bind(this)}>
        ${this.decodeRequestParameters ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded)}
      </devtools-button>`}`, paramsTreeElement.listItemElement);
        paramsTreeElement.removeChildren();
        if (shouldViewSource) {
            this.populateTreeElementWithSourceText(paramsTreeElement, (sourceText ?? '').trim());
            paramsTreeElement.listItemElement.addEventListener('contextmenu', viewParsedContextMenu);
        }
        else {
            this.populateTreeElementWithParsedParameters(paramsTreeElement, params);
            paramsTreeElement.listItemElement.addEventListener('contextmenu', viewSourceContextMenu);
        }
    }
    static formatParameter(value, className, decodeParameters) {
        let errorDecoding = false;
        if (decodeParameters) {
            value = value.replace(/\+/g, ' ');
            if (value.indexOf('%') >= 0) {
                try {
                    value = decodeURIComponent(value);
                }
                catch {
                    errorDecoding = true;
                }
            }
        }
        const classes = classMap({ [className]: !!className, 'empty-value': value === '' });
        return html `<div class=${classes}>
      ${errorDecoding ? html `<span class=payload-decode-error>${i18nString(UIStrings.unableToDecodeValue)}</span>` :
            value}
    </div>`;
    }
    populateTreeElementWithParsedParameters(paramsTreeElement, params) {
        for (const param of params || []) {
            const paramNameValue = document.createDocumentFragment();
            if (param.name !== '') {
                render(html `${RequestPayloadView.formatParameter(param.name, 'payload-name', this.decodeRequestParameters)}${RequestPayloadView.formatParameter(param.value, 'payload-value source-code', this.decodeRequestParameters)}`, paramNameValue);
            }
            else {
                render(RequestPayloadView.formatParameter(i18nString(UIStrings.empty), 'empty-request-payload', this.decodeRequestParameters), paramNameValue);
            }
            const paramTreeElement = new UI.TreeOutline.TreeElement(paramNameValue);
            this.addEntryContextMenuHandler(paramTreeElement, i18nString(UIStrings.copyValue), 'copy-value', () => decodeURIComponent(param.value));
            paramsTreeElement.appendChild(paramTreeElement);
        }
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refreshRequestJSONPayload(parsedObject, sourceText) {
        const rootListItem = this.requestPayloadCategory;
        const viewParsed = function (event) {
            rootListItemElement.removeEventListener('contextmenu', viewParsedContextMenu);
            viewSourceForItems.delete(rootListItem);
            this.refreshRequestJSONPayload(parsedObject, sourceText);
            event.consume();
        };
        const viewParsedContextMenu = (event) => {
            if (!rootListItem.expanded) {
                return;
            }
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            contextMenu.newSection().appendItem(i18nString(UIStrings.viewParsed), viewParsed.bind(this, event), { jslogContext: 'view-parsed' });
            void contextMenu.show();
        };
        const viewSource = function (event) {
            rootListItemElement.removeEventListener('contextmenu', viewSourceContextMenu);
            viewSourceForItems.add(rootListItem);
            this.refreshRequestJSONPayload(parsedObject, sourceText);
            event.consume();
        };
        const viewSourceContextMenu = (event) => {
            if (!rootListItem.expanded) {
                return;
            }
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            contextMenu.newSection().appendItem(i18nString(UIStrings.viewSource), viewSource.bind(this, event), { jslogContext: 'view-source' });
            void contextMenu.show();
        };
        const showSource = viewSourceForItems.has(rootListItem);
        const rootListItemElement = rootListItem.listItemElement;
        render(html `<div class="selection fill"></div>${i18nString(UIStrings.requestPayload)}${this.createViewSourceToggle(showSource, showSource ? viewParsed.bind(this) : viewSource.bind(this))}`, rootListItemElement);
        rootListItem.removeChildren();
        if (showSource) {
            this.populateTreeElementWithSourceText(rootListItem, sourceText);
            rootListItemElement.addEventListener('contextmenu', viewParsedContextMenu);
        }
        else {
            rootListItem.childrenListElement.classList.add('source-code', 'object-properties-section');
            this.populateTreeElementWithObject(rootListItem, parsedObject);
            rootListItemElement.addEventListener('contextmenu', viewSourceContextMenu);
        }
    }
    populateTreeElementWithObject(rootListItem, parsedObject) {
        const object = new SDK.RemoteObject.LocalJSONObject(parsedObject);
        const section = new ObjectUI.ObjectPropertiesSection.RootElement(new ObjectUI.ObjectPropertiesSection.ObjectTree(object));
        section.title = (object.description);
        section.expand();
        rootListItem.appendChild(section);
    }
    createViewSourceToggle(viewSource, handler) {
        return html `<devtools-button
        class=payload-toggle
        jslogi=${VisualLogging.action().track({ click: true }).context('source-parse')}
        .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
        @click=${handler}>
      ${viewSource ? i18nString(UIStrings.viewParsed) : i18nString(UIStrings.viewSource)}
    </devtools-button>`;
    }
    toggleURLDecoding(event) {
        this.decodeRequestParameters = !this.decodeRequestParameters;
        this.refreshQueryString();
        void this.refreshFormData();
        event.consume();
    }
}
const viewSourceForItems = new WeakSet();
export class Category extends UI.TreeOutline.TreeElement {
    toggleOnClick;
    expandedSetting;
    expanded;
    constructor(root, name, title) {
        super(title || '', true);
        this.toggleOnClick = true;
        this.hidden = true;
        this.expandedSetting =
            Common.Settings.Settings.instance().createSetting('request-info-' + name + '-category-expanded', true);
        this.expanded = this.expandedSetting.get();
        this.listItemElement.setAttribute('jslog', `${VisualLogging.section().context(name)}`);
        root.appendChild(this);
    }
    createLeaf() {
        const leaf = new UI.TreeOutline.TreeElement();
        this.appendChild(leaf);
        return leaf;
    }
    onexpand() {
        this.expandedSetting.set(true);
    }
    oncollapse() {
        this.expandedSetting.set(false);
    }
}
//# sourceMappingURL=RequestPayloadView.js.map