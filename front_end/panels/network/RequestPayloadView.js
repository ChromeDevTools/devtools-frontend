// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectPropertiesSectionStyles from '../../ui/legacy/components/object_ui/objectPropertiesSection.css.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { BinaryResourceView } from './BinaryResourceView.js';
import requestPayloadTreeStyles from './requestPayloadTree.css.js';
import requestPayloadViewStyles from './requestPayloadView.css.js';
import { ShowMoreDetailsWidget } from './ShowMoreDetailsWidget.js';
const { classMap } = Directives;
const { widget } = UI.Widget;
const { ifExpanded } = UI.TreeOutline;
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
export const DEFAULT_VIEW = (input, output, target) => {
    const createViewSourceToggle = (viewSource, callback) => html `<devtools-button
      class="payload-toggle"
      jslog=${VisualLogging.action().track({ click: true }).context('source-parse')}
      .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
      @click=${(e) => {
        e.consume();
        callback(!viewSource);
    }}>
      ${viewSource ? i18nString(UIStrings.viewParsed) : i18nString(UIStrings.viewSource)}
    </devtools-button>`;
    const copyValueContextmenu = (title, value, jslogContext) => (e) => {
        e.consume(true);
        const contextMenu = new UI.ContextMenu.ContextMenu(e);
        const copyValueHandler = () => input.copyValue(value());
        contextMenu.clipboardSection().appendItem(title, copyValueHandler, { jslogContext });
        void contextMenu.show();
    };
    const createSourceText = (text) => html `<li role=treeitem
      @contextmenu=${copyValueContextmenu(i18nString(UIStrings.copyPayload), () => text, 'copy-payload')}>
        <devtools-widget class='payload-value source-code' ${widget(ShowMoreDetailsWidget, { text })}>
        </devtools-widget>
      </li>`;
    const createParsedParams = (params, decodeParameters) => params.map(param => {
        // clang-format off
        return html `
        <li role=treeitem
            @contextmenu=${copyValueContextmenu(i18nString(UIStrings.copyValue), () => decodeURIComponent(param.value), 'copy-value')}>
          ${param.name !== '' ? html `
            ${RequestPayloadView.formatParameter(param.name, 'payload-name', decodeParameters)}
            ${RequestPayloadView.formatParameter(param.value, 'payload-value source-code', decodeParameters)}
          ` : RequestPayloadView.formatParameter(i18nString(UIStrings.empty), 'empty-request-payload', decodeParameters)}
        </li>
      `;
        // clang-format on
    });
    const parsedFormData = (() => {
        if (input.formData && !input.formParameters) {
            try {
                return JSON.parse(input.formData);
            }
            catch {
            }
        }
        return undefined;
    })();
    const createPayload = (parsedFormData) => {
        if (!parsedFormData) {
            return nothing;
        }
        const object = new SDK.RemoteObject.LocalJSONObject(parsedFormData);
        const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
            readOnly: true,
            propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
        });
        return html `
      <li role=treeitem class="source-code object-properties-section-root-element object-properties-section" open>
        ${object.description}
        ${object.hasChildren ? ObjectUI.ObjectPropertiesSection.renderObjectTree(objectTree) : nothing}
      </li>
    `;
    };
    const queryStringExpandedSetting = Common.Settings.Settings.instance().createSetting('request-info-query-string-category-expanded', true);
    const formDataExpandedSetting = Common.Settings.Settings.instance().createSetting('request-info-form-data-category-expanded', true);
    const requestPayloadExpandedSetting = Common.Settings.Settings.instance().createSetting('request-info-request-payload-category-expanded', true);
    const onContextMenu = (viewSource, setViewSource, decoding) => (event) => {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const section = contextMenu.newSection();
        if (viewSource) {
            section.appendItem(i18nString(UIStrings.viewParsed), () => setViewSource(!viewSource), { jslogContext: 'view-parsed' });
        }
        else {
            section.appendItem(i18nString(UIStrings.viewSource), () => setViewSource(!viewSource), { jslogContext: 'view-source' });
            if (decoding) {
                const viewURLEncodedText = decoding.decode ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded);
                section.appendItem(viewURLEncodedText, () => decoding.toggleDecode(), { jslogContext: 'toggle-url-decoding' });
            }
        }
        void contextMenu.show();
    };
    // clang-format off
    render(html `<style>${requestPayloadViewStyles}</style>
   <devtools-tree dense class=request-payload-tree .template=${html `
     <style>${objectValueStyles}</style>
     <style>${objectPropertiesSectionStyles}</style>
     <style>${requestPayloadTreeStyles}</style>
     <ul role=tree>
      <li
          role=treeitem
          ?hidden=${!input.queryParameters}
          jslog=${VisualLogging.section().context('query-string')}
          @contextmenu=${onContextMenu(input.viewQueryParamSource, input.setViewQueryParamSource, {
        decode: input.decodeQueryParameters,
        toggleDecode: () => input.setDecodeQueryParameters(!input.decodeQueryParameters),
    })}
          @expanded=${(e) => queryStringExpandedSetting.set(e.detail.expanded)}
          ?open=${queryStringExpandedSetting.get()}
        >
        <div class="selection fill"></div>${i18nString(UIStrings.queryStringParameters)}<span
          class=payload-count>${`\xA0(${input.queryParameters?.length ?? 0})`}</span>${createViewSourceToggle(input.viewQueryParamSource, input.setViewQueryParamSource)}
        <devtools-button
            class=payload-toggle
            ?hidden=${input.viewQueryParamSource}
            jslog=${VisualLogging.action().track({ click: true }).context('decode-encode')}
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            @click=${(e) => { e.consume(); input.setDecodeQueryParameters(!input.decodeQueryParameters); }}>
          ${input.decodeQueryParameters ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded)}
        </devtools-button>
        <ul role=group>
          ${ifExpanded(input.viewQueryParamSource ? createSourceText(input.queryString ?? '')
        : createParsedParams(input.queryParameters ?? [], input.decodeQueryParameters))}
        </ul>
      </li>
      <li
          role=treeitem
          ?hidden=${!input.formData || !input.formParameters}
          jslog=${VisualLogging.section().context('form-data')}
          @contextmenu=${onContextMenu(input.viewFormParamSource, input.setViewFormParamSource, {
        decode: input.decodeFormParameters,
        toggleDecode: () => input.setDecodeFormParameters(!input.decodeFormParameters),
    })}
          @expanded=${(e) => formDataExpandedSetting.set(e.detail.expanded)}
          ?open=${formDataExpandedSetting.get()}
        >
        <div class="selection fill"></div>${i18nString(UIStrings.formData)}<span
          class=payload-count>${`\xA0(${input.formParameters?.length ?? 0})`}</span>${createViewSourceToggle(input.viewFormParamSource, input.setViewFormParamSource)}
        <devtools-button
            class=payload-toggle
            ?hidden=${input.viewFormParamSource}
            jslog=${VisualLogging.action().track({ click: true }).context('decode-encode')}
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            @click=${(e) => { e.consume(); input.setDecodeFormParameters(!input.decodeFormParameters); }}>
          ${input.decodeFormParameters ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded)}
        </devtools-button>
        <ul role=group>
          ${ifExpanded(input.viewFormParamSource ? createSourceText(input.formData ?? '')
        : createParsedParams(input.formParameters ?? [], input.decodeFormParameters))}
        </ul>
      </li>
      <li
          role=treeitem
          ?hidden=${!input.formData || Boolean(input.formParameters) || Boolean(input.binaryPayloadContentData)}
          jslog=${VisualLogging.section().context('request-payload')}
          @contextmenu=${onContextMenu(input.viewJSONPayloadSource, input.setViewJSONPayloadSource)}
          @expanded=${(e) => requestPayloadExpandedSetting.set(e.detail.expanded)}
          ?open=${requestPayloadExpandedSetting.get()}
        >
        <div class="selection fill"></div>${i18nString(UIStrings.requestPayload)}${createViewSourceToggle(input.viewJSONPayloadSource, input.setViewJSONPayloadSource)}
        <ul role=group>
          ${ifExpanded(!parsedFormData || input.viewJSONPayloadSource ? createSourceText(input.formData ?? '')
        : createPayload(parsedFormData))}
        </ul>
      </li>
     </ul>
     `}></devtools-tree>
   ${input.binaryPayloadContentData ? html `
     <div class="raw-payload-section"
          jslog=${VisualLogging.section().context('binary-request-payload')}>
       ${widget(element => {
        const streamingContent = TextUtils.StreamingContentData.StreamingContentData.from(input.binaryPayloadContentData);
        return new BinaryResourceView(streamingContent, input.requestUrl, Common.ResourceType.resourceTypes.XHR, element);
    })}
     </div>` : nothing}
   `, target, {
        container: {
            classes: ['request-payload-view'],
            attributes: {
                jslog: `${VisualLogging.pane('payload').track({ resize: true })}`,
            },
        }
    });
    // clang-format on
};
export class RequestPayloadView extends UI.Widget.VBox {
    #request;
    #decodeQueryParameters = true;
    #decodeFormParameters = true;
    #formData;
    #formParameters;
    #binaryPayloadContentData = null;
    #view;
    #viewJSONPayloadSource = false;
    #viewFormParamSource = false;
    #viewQueryParamSource = false;
    #refreshFormDataPromiseForTest = Promise.resolve();
    constructor(target, view = DEFAULT_VIEW) {
        super();
        this.#view = view;
    }
    set request(request) {
        if (this.#request) {
            this.#request.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshFormData, this);
        }
        this.#request = request;
        this.#decodeQueryParameters = true;
        this.#decodeFormParameters = true;
        const contentType = request.requestContentType();
        if (contentType) {
            this.#decodeFormParameters = Boolean(contentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i));
        }
        if (this.isShowing()) {
            this.#request?.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshFormData, this);
        }
        this.requestUpdate();
        this.#refreshFormData();
    }
    get request() {
        return this.#request;
    }
    get refreshFormDataPromiseForTest() {
        return this.#refreshFormDataPromiseForTest;
    }
    wasShown() {
        super.wasShown();
        this.request?.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshFormData, this);
        this.#refreshFormData();
    }
    willHide() {
        super.willHide();
        this.request?.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshFormData, this);
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
    performUpdate() {
        if (!this.request) {
            return;
        }
        const input = {
            queryString: this.request.queryString(),
            queryParameters: this.request.queryParameters,
            formData: this.#formData,
            formParameters: this.#formParameters,
            decodeQueryParameters: this.#decodeQueryParameters,
            setDecodeQueryParameters: (value) => {
                this.#decodeQueryParameters = value;
                this.requestUpdate();
            },
            decodeFormParameters: this.#decodeFormParameters,
            setDecodeFormParameters: (value) => {
                this.#decodeFormParameters = value;
                this.requestUpdate();
            },
            viewQueryParamSource: this.#viewQueryParamSource,
            setViewQueryParamSource: (value) => {
                this.#viewQueryParamSource = value;
                this.requestUpdate();
            },
            viewFormParamSource: this.#viewFormParamSource,
            setViewFormParamSource: (value) => {
                this.#viewFormParamSource = value;
                this.requestUpdate();
            },
            viewJSONPayloadSource: this.#viewJSONPayloadSource,
            setViewJSONPayloadSource: (value) => {
                this.#viewJSONPayloadSource = value;
                this.requestUpdate();
            },
            copyValue: (value) => {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(value);
            },
            binaryPayloadContentData: this.#binaryPayloadContentData,
            requestUrl: this.request?.url() ?? Platform.DevToolsPath.EmptyUrlString,
        };
        this.#view(input, {}, this.element);
    }
    #refreshFormData() {
        this.#refreshFormDataPromiseForTest = this.#doRefreshFormData();
    }
    async #doRefreshFormData() {
        this.#formData = await this.request?.requestFormData() ?? undefined;
        if (this.#formData) {
            this.#formParameters = await this.request?.formParameters() ?? undefined;
        }
        // Fetch raw binary content data for the request body when the backend
        // returns base64-encoded data. This enables the binary viewer (hex,
        // base64, utf-8) in the Payload tab for compressed/binary bodies.
        this.#binaryPayloadContentData = null;
        if (this.request && !this.#formParameters) {
            const contentData = await this.request.requestFormDataContentData();
            if (!TextUtils.ContentData.ContentData.isError(contentData) && !contentData.isTextContent &&
                contentData.createdFromBase64) {
                this.#binaryPayloadContentData = contentData;
            }
        }
        this.requestUpdate();
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
}
//# sourceMappingURL=RequestPayloadView.js.map