// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { PanelUtils } from '../utils/utils.js';
const { Directives: { ref }, html, render } = Lit;
export class AdoptedStyleSheetSetTreeElement extends UI.TreeOutline.TreeElement {
    adoptedStyleSheets;
    constructor(adoptedStyleSheets) {
        super('');
        this.adoptedStyleSheets = adoptedStyleSheets;
        const documentElement = this.listItemElement.createChild('span');
        UI.UIUtils.createTextChild(documentElement, '#adopted-style-sheets');
        for (const adoptedStyleSheet of adoptedStyleSheets) {
            this.appendChild(new AdoptedStyleSheetTreeElement(adoptedStyleSheet));
        }
    }
}
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
            }));
            UI.UIUtils.createTextChild(documentElement, ')');
        }
        treeElement.appendChild(new AdoptedStyleSheetContentsTreeElement(header));
    }
    highlight() {
        PanelUtils.highlightElement(this.listItemElement);
    }
}
export class AdoptedStyleSheetContentsTreeElement extends UI.TreeOutline.TreeElement {
    widget;
    widgetWrapper;
    constructor(styleSheetHeader) {
        super('');
        this.widgetWrapper = document.createElement('div');
        this.widgetWrapper.style.display = 'contents';
        this.title = this.widgetWrapper;
        this.widget = new AdoptedStyleSheetContentsWidget();
        this.widget.styleSheetHeader = styleSheetHeader;
        this.widget.element.classList.remove('vbox', 'flex-auto');
        this.widget.element.style.display = 'contents';
        this.widget.markAsRoot();
        this.widget.show(this.widgetWrapper);
    }
    onbind() {
        if (!this.widget.isShowing()) {
            this.widget.show(this.widgetWrapper);
        }
    }
    onunbind() {
        this.widget.detach();
    }
    async onpopulate() {
        if (!this.widget.text) {
            await this.widget.fetchContent();
        }
        this.widget.requestUpdate();
        await this.widget.updateComplete;
    }
    ondblclick(event) {
        if (this.widget.isEditing()) {
            return false;
        }
        this.widget.startEditing(event.target);
        return false;
    }
    onenter() {
        if (this.widget.isEditing()) {
            return false;
        }
        void this.widget.startEditing();
        return true;
    }
    isEditing() {
        return this.widget.isEditing();
    }
}
export const DEFAULT_ADOPTED_STYLESHEET_CONTENTS_VIEW = (input, _output, target) => {
    const highlightNode = ref(el => {
        if (el) {
            el.textContent = input.text;
            void CodeHighlighter.CodeHighlighter.highlightNode(el, 'text/css');
        }
    });
    // clang-format off
    render(html `
        <span class="webkit-html-text-node webkit-html-css-node"
              jslog=${VisualLogging.value('css-text-node').track({
        change: true,
        dblclick: true,
    })}
              ${highlightNode}
              @dblclick=${input.onDblClick}></span>
      `, target);
    // clang-format on
};
export class AdoptedStyleSheetContentsWidget extends UI.Widget.Widget {
    #styleSheetHeader;
    #text = '';
    #fetchContentPromise = null;
    #editing = null;
    #view;
    constructor(element, view = DEFAULT_ADOPTED_STYLESHEET_CONTENTS_VIEW) {
        super(element, { useShadowDom: false });
        this.#view = view;
    }
    get text() {
        return this.#text;
    }
    set styleSheetHeader(header) {
        if (this.#styleSheetHeader === header) {
            return;
        }
        if (this.#styleSheetHeader) {
            this.#styleSheetHeader.cssModel().removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.#onStyleSheetChanged, this);
        }
        this.#styleSheetHeader = header;
        this.#text = '';
        if (this.isShowing() && this.#styleSheetHeader) {
            this.#styleSheetHeader.cssModel().addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.#onStyleSheetChanged, this);
            void this.fetchContent();
        }
    }
    get styleSheetHeader() {
        return this.#styleSheetHeader;
    }
    wasShown() {
        super.wasShown();
        if (this.#styleSheetHeader) {
            this.#styleSheetHeader.cssModel().addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.#onStyleSheetChanged, this);
            if (!this.#text) {
                void this.fetchContent();
            }
        }
    }
    willHide() {
        super.willHide();
        if (this.#editing) {
            this.#editing.cancel();
            this.#editing = null;
        }
        if (this.#styleSheetHeader) {
            this.#styleSheetHeader.cssModel().removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.#onStyleSheetChanged, this);
        }
    }
    async fetchContent() {
        const header = this.#styleSheetHeader;
        if (!header) {
            return;
        }
        if (this.#fetchContentPromise) {
            return await this.#fetchContentPromise;
        }
        this.#fetchContentPromise = (async () => {
            try {
                const data = await header.requestContentData();
                if (!TextUtils.ContentData.ContentData.isError(data) && data.isTextContent) {
                    this.#text = data.text.replace(/^[\n\r]+|\s+$/g, '');
                    this.requestUpdate();
                }
            }
            finally {
                this.#fetchContentPromise = null;
            }
        })();
        return await this.#fetchContentPromise;
    }
    #onStyleSheetChanged({ data: { styleSheetId } }) {
        if (styleSheetId === this.#styleSheetHeader?.id) {
            void this.fetchContent();
        }
    }
    startEditing(target) {
        if (this.#editing || !this.#styleSheetHeader) {
            return;
        }
        const textNode = (target ? target.enclosingNodeOrSelfWithClass('webkit-html-text-node') : null) ??
            this.contentElement.querySelector('.webkit-html-text-node');
        if (!textNode || UI.UIUtils.isBeingEdited(textNode)) {
            return;
        }
        const dummyEditorHandles = {
            commit: () => { },
            cancel: () => { },
            resize: () => { },
        };
        this.#editing = dummyEditorHandles;
        void (async () => {
            if (!this.#styleSheetHeader) {
                this.#editing = null;
                return;
            }
            const data = await this.#styleSheetHeader.requestContentData();
            textNode.textContent = (TextUtils.ContentData.ContentData.isError(data) || !data.isTextContent) ? '' : data.text;
            const config = new UI.InplaceEditor.Config((element, newText, oldText) => this.#editingCommitted(element, newText, oldText), () => this.#editingCancelled(), undefined);
            const editorHandles = UI.InplaceEditor.InplaceEditor.startEditing(textNode, config);
            if (!editorHandles) {
                this.#editing = null;
                return;
            }
            this.#editing = {
                commit: editorHandles.commit,
                cancel: editorHandles.cancel,
                resize: () => { },
            };
            const selection = this.contentElement.getComponentSelection();
            selection?.selectAllChildren(textNode);
        })();
    }
    async #editingCommitted(_element, newText, oldText) {
        this.#editing = null;
        if (newText !== oldText && this.#styleSheetHeader) {
            await this.#styleSheetHeader.cssModel().setStyleSheetText(this.#styleSheetHeader.id, newText, false);
        }
        this.#editingCancelled();
    }
    #editingCancelled() {
        this.#editing = null;
        void this.fetchContent();
    }
    isEditing() {
        return this.#editing !== null;
    }
    performUpdate() {
        if (this.isEditing()) {
            return;
        }
        this.#view({
            text: this.#text,
            isEditing: this.isEditing(),
            onDblClick: (event) => {
                event.stopPropagation();
                this.startEditing(event.target);
            },
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=AdoptedStyleSheetTreeElement.js.map