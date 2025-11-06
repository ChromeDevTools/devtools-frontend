// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestPayloadTreeStyles from './requestPayloadTree.css.js';
import requestPayloadViewStyles from './requestPayloadView.css.js';
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
     * @description Text to show more content
     */
    showMore: 'Show more',
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
        this.requestPayloadCategory = new Category(root, 'request-payload', i18nString(UIStrings.requestPayload));
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
        const div = document.createElement('div');
        if (className) {
            div.className = className;
        }
        if (value === '') {
            div.classList.add('empty-value');
        }
        if (errorDecoding) {
            div.createChild('span', 'payload-decode-error').textContent = i18nString(UIStrings.unableToDecodeValue);
        }
        else {
            div.textContent = value;
        }
        return div;
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
    populateTreeElementWithSourceText(treeElement, sourceText) {
        const MAX_LENGTH = 3000;
        const text = (sourceText || '').trim();
        const trim = text.length > MAX_LENGTH;
        const sourceTextElement = document.createElement('span');
        sourceTextElement.classList.add('payload-value');
        sourceTextElement.classList.add('source-code');
        sourceTextElement.textContent = trim ? text.substr(0, MAX_LENGTH) : text;
        const sourceTreeElement = new UI.TreeOutline.TreeElement(sourceTextElement);
        treeElement.removeChildren();
        treeElement.appendChild(sourceTreeElement);
        this.addEntryContextMenuHandler(sourceTreeElement, i18nString(UIStrings.copyPayload), 'copy-payload', () => text);
        if (!trim) {
            return;
        }
        const showMoreButton = new Buttons.Button.Button();
        showMoreButton.data = { variant: "outlined" /* Buttons.Button.Variant.OUTLINED */, jslogContext: 'show-more' };
        showMoreButton.innerText = i18nString(UIStrings.showMore);
        showMoreButton.classList.add('request-payload-show-more-button');
        function showMore() {
            showMoreButton.remove();
            sourceTextElement.textContent = text;
            sourceTreeElement.listItemElement.removeEventListener('contextmenu', onContextMenuShowMore);
        }
        showMoreButton.addEventListener('click', showMore);
        function onContextMenuShowMore(event) {
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            const section = contextMenu.newSection();
            section.appendItem(i18nString(UIStrings.showMore), showMore, { jslogContext: 'show-more' });
            void contextMenu.show();
        }
        sourceTreeElement.listItemElement.addEventListener('contextmenu', onContextMenuShowMore);
        sourceTextElement.appendChild(showMoreButton);
    }
    refreshParams(title, params, sourceText, paramsTreeElement) {
        paramsTreeElement.removeChildren();
        paramsTreeElement.listItemElement.removeChildren();
        paramsTreeElement.listItemElement.createChild('div', 'selection fill');
        UI.UIUtils.createTextChild(paramsTreeElement.listItemElement, title);
        const payloadCount = document.createElement('span');
        payloadCount.classList.add('payload-count');
        const numberOfParams = params ? params.length : 0;
        payloadCount.textContent = `\xA0(${numberOfParams})`;
        paramsTreeElement.listItemElement.appendChild(payloadCount);
        const shouldViewSource = viewSourceForItems.has(paramsTreeElement);
        if (shouldViewSource) {
            this.appendParamsSource(title, params, sourceText, paramsTreeElement);
        }
        else {
            this.appendParamsParsed(title, params, sourceText, paramsTreeElement);
        }
    }
    appendParamsSource(title, params, sourceText, paramsTreeElement) {
        this.populateTreeElementWithSourceText(paramsTreeElement, sourceText);
        const listItemElement = paramsTreeElement.listItemElement;
        const viewParsed = function (event) {
            listItemElement.removeEventListener('contextmenu', viewParsedContextMenu);
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
        const viewParsedButton = this.createViewSourceToggle(/* viewSource */ true, viewParsed.bind(this));
        listItemElement.appendChild(viewParsedButton);
        listItemElement.addEventListener('contextmenu', viewParsedContextMenu);
    }
    appendParamsParsed(title, params, sourceText, paramsTreeElement) {
        for (const param of params || []) {
            const paramNameValue = document.createDocumentFragment();
            if (param.name !== '') {
                const name = RequestPayloadView.formatParameter(param.name, 'payload-name', this.decodeRequestParameters);
                const value = RequestPayloadView.formatParameter(param.value, 'payload-value source-code', this.decodeRequestParameters);
                paramNameValue.appendChild(name);
                paramNameValue.appendChild(value);
            }
            else {
                paramNameValue.appendChild(RequestPayloadView.formatParameter(i18nString(UIStrings.empty), 'empty-request-payload', this.decodeRequestParameters));
            }
            const paramTreeElement = new UI.TreeOutline.TreeElement(paramNameValue);
            this.addEntryContextMenuHandler(paramTreeElement, i18nString(UIStrings.copyValue), 'copy-value', () => decodeURIComponent(param.value));
            paramsTreeElement.appendChild(paramTreeElement);
        }
        const listItemElement = paramsTreeElement.listItemElement;
        const viewSource = function (event) {
            listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);
            viewSourceForItems.add(paramsTreeElement);
            this.refreshParams(title, params, sourceText, paramsTreeElement);
            event.consume();
        };
        const toggleURLDecoding = function (event) {
            listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);
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
        const viewSourceButton = this.createViewSourceToggle(/* viewSource */ false, viewSource.bind(this));
        listItemElement.appendChild(viewSourceButton);
        const toggleTitle = this.decodeRequestParameters ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded);
        const toggleButton = UI.UIUtils.createTextButton(toggleTitle, toggleURLDecoding.bind(this), { jslogContext: 'decode-encode', className: 'payload-toggle' });
        listItemElement.appendChild(toggleButton);
        listItemElement.addEventListener('contextmenu', viewSourceContextMenu);
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refreshRequestJSONPayload(parsedObject, sourceText) {
        const rootListItem = this.requestPayloadCategory;
        rootListItem.removeChildren();
        const rootListItemElement = rootListItem.listItemElement;
        rootListItemElement.removeChildren();
        rootListItemElement.createChild('div', 'selection fill');
        UI.UIUtils.createTextChild(rootListItemElement, this.requestPayloadCategory.title.toString());
        if (viewSourceForItems.has(rootListItem)) {
            this.appendJSONPayloadSource(rootListItem, parsedObject, sourceText);
        }
        else {
            this.appendJSONPayloadParsed(rootListItem, parsedObject, sourceText);
        }
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appendJSONPayloadSource(rootListItem, parsedObject, sourceText) {
        const rootListItemElement = rootListItem.listItemElement;
        this.populateTreeElementWithSourceText(rootListItem, sourceText);
        const viewParsed = function (event) {
            rootListItemElement.removeEventListener('contextmenu', viewParsedContextMenu);
            viewSourceForItems.delete(rootListItem);
            this.refreshRequestJSONPayload(parsedObject, sourceText);
            event.consume();
        };
        const viewParsedButton = this.createViewSourceToggle(/* viewSource */ true, viewParsed.bind(this));
        rootListItemElement.appendChild(viewParsedButton);
        const viewParsedContextMenu = (event) => {
            if (!rootListItem.expanded) {
                return;
            }
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            contextMenu.newSection().appendItem(i18nString(UIStrings.viewParsed), viewParsed.bind(this, event), { jslogContext: 'view-parsed' });
            void contextMenu.show();
        };
        rootListItemElement.addEventListener('contextmenu', viewParsedContextMenu);
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appendJSONPayloadParsed(rootListItem, parsedObject, sourceText) {
        const object = SDK.RemoteObject.RemoteObject.fromLocalObject(parsedObject);
        const section = new ObjectUI.ObjectPropertiesSection.RootElement(new ObjectUI.ObjectPropertiesSection.ObjectTree(object));
        section.title = (object.description);
        section.expand();
        // `editable` is not a valid property for `ObjectUI.ObjectPropertiesSection.RootElement`. Only for
        // `ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection`. We do not know if this assignment is
        // safe to delete.
        // @ts-expect-error
        section.editable = false;
        rootListItem.childrenListElement.classList.add('source-code', 'object-properties-section');
        rootListItem.appendChild(section);
        const rootListItemElement = rootListItem.listItemElement;
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
        const viewSourceButton = this.createViewSourceToggle(/* viewSource */ false, viewSource.bind(this));
        rootListItemElement.appendChild(viewSourceButton);
        rootListItemElement.addEventListener('contextmenu', viewSourceContextMenu);
    }
    createViewSourceToggle(viewSource, handler) {
        const viewSourceToggleTitle = viewSource ? i18nString(UIStrings.viewParsed) : i18nString(UIStrings.viewSource);
        return UI.UIUtils.createTextButton(viewSourceToggleTitle, handler, { jslogContext: 'source-parse', className: 'payload-toggle' });
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