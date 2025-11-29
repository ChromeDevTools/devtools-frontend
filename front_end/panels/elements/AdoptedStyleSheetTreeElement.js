// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
export class AdoptedStyleSheetTreeElement extends UI.TreeOutline.TreeElement {
    adoptedStyleSheet;
    eventListener = null;
    constructor(adoptedStyleSheet) {
        super('');
        this.adoptedStyleSheet = adoptedStyleSheet;
        const header = adoptedStyleSheet.cssModel.styleSheetHeaderForId(adoptedStyleSheet.id);
        if (header) {
            AdoptedStyleSheetTreeElement.createContents(header, this);
        }
        else {
            this.eventListener = adoptedStyleSheet.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.onStyleSheetAdded, this);
        }
    }
    onStyleSheetAdded({ data: header }) {
        if (header.id === this.adoptedStyleSheet.id) {
            AdoptedStyleSheetTreeElement.createContents(header, this);
            this.adoptedStyleSheet.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.onStyleSheetAdded, this);
            this.eventListener = null;
        }
    }
    static createContents(header, treeElement) {
        const documentElement = treeElement.listItemElement.createChild('span');
        const linkText = header.sourceURL;
        UI.UIUtils.createTextChild(documentElement, '#adopted-style-sheet' + (linkText ? ' (' : ''));
        if (linkText) {
            documentElement.appendChild(Components.Linkifier.Linkifier.linkifyURL(linkText, {
                text: linkText,
                preventClick: true,
                showColumnNumber: false,
                inlineFrameIndex: 0,
            }));
            UI.UIUtils.createTextChild(documentElement, ')');
        }
        treeElement.appendChild(new AdoptedStyleSheetContentsTreeElement(header));
    }
}
export class AdoptedStyleSheetContentsTreeElement extends UI.TreeOutline.TreeElement {
    styleSheetHeader;
    constructor(styleSheetHeader) {
        super('');
        this.styleSheetHeader = styleSheetHeader;
    }
    onbind() {
        this.styleSheetHeader.cssModel().addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.onStyleSheetChanged, this);
        void this.onpopulate();
    }
    onunbind() {
        this.styleSheetHeader.cssModel().removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.onStyleSheetChanged, this);
    }
    async onpopulate() {
        const data = await this.styleSheetHeader.requestContentData();
        if (!TextUtils.ContentData.ContentData.isError(data) && data.isTextContent) {
            this.listItemElement.removeChildren();
            const newNode = this.listItemElement.createChild('span', 'webkit-html-text-node webkit-html-css-node');
            newNode.setAttribute('jslog', `${VisualLogging.value('css-text-node').track({ change: true, dblclick: true })}`);
            const text = data.text;
            newNode.textContent = text.replace(/^[\n\r]+|\s+$/g, '');
            void CodeHighlighter.CodeHighlighter.highlightNode(newNode, 'text/css');
        }
    }
    onStyleSheetChanged({ data: { styleSheetId } }) {
        if (styleSheetId === this.styleSheetHeader.id) {
            void this.onpopulate();
        }
    }
}
//# sourceMappingURL=AdoptedStyleSheetTreeElement.js.map