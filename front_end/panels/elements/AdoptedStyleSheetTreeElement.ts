// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import {PanelUtils} from '../utils/utils.js';

import type {EditorHandles} from './ElementsTreeElement.js';

const {html, render} = Lit;

export class AdoptedStyleSheetSetTreeElement extends UI.TreeOutline.TreeElement {
  constructor(readonly adoptedStyleSheets: SDK.DOMModel.AdoptedStyleSheet[]) {
    super('');
    const documentElement = this.listItemElement.createChild('span');
    UI.UIUtils.createTextChild(documentElement, '#adopted-style-sheets');
    for (const adoptedStyleSheet of adoptedStyleSheets) {
      this.appendChild(new AdoptedStyleSheetTreeElement(adoptedStyleSheet));
    }
  }
}

export class AdoptedStyleSheetTreeElement extends UI.TreeOutline.TreeElement {
  private eventListener: Common.EventTarget.EventDescriptor|null = null;

  constructor(readonly adoptedStyleSheet: SDK.DOMModel.AdoptedStyleSheet) {
    super('');
    const header = adoptedStyleSheet.cssModel.styleSheetHeaderForId(adoptedStyleSheet.id);
    if (header) {
      AdoptedStyleSheetTreeElement.createContents(header, this);
    } else {
      this.eventListener = adoptedStyleSheet.cssModel.addEventListener(
          SDK.CSSModel.Events.StyleSheetAdded, this.onStyleSheetAdded, this);
    }
  }

  onStyleSheetAdded({data: header}: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>):
      void {
    if (header.id === this.adoptedStyleSheet.id) {
      AdoptedStyleSheetTreeElement.createContents(header, this);
      this.adoptedStyleSheet.cssModel.removeEventListener(
          SDK.CSSModel.Events.StyleSheetAdded, this.onStyleSheetAdded, this);
      this.eventListener = null;
    }
  }

  static createContents(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, treeElement: UI.TreeOutline.TreeElement):
      void {
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

  highlight(): void {
    PanelUtils.highlightElement(this.listItemElement);
  }
}

export class AdoptedStyleSheetContentsTreeElement extends UI.TreeOutline.TreeElement {
  readonly widget: AdoptedStyleSheetContentsWidget;
  private readonly widgetWrapper: HTMLElement;

  constructor(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader) {
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

  override onbind(): void {
    if (!this.widget.isShowing()) {
      this.widget.show(this.widgetWrapper);
    }
  }

  override onunbind(): void {
    this.widget.detach();
  }

  override async onpopulate(): Promise<void> {
    if (!this.widget.text) {
      await this.widget.fetchContent();
    }
    this.widget.requestUpdate();
    await this.widget.updateComplete;
  }

  override ondblclick(event: Event): boolean {
    if (this.widget.isEditing()) {
      return false;
    }
    this.widget.startEditing(event.target as Element);
    return false;
  }

  override onenter(): boolean {
    if (this.widget.isEditing()) {
      return false;
    }
    void this.widget.startEditing();
    return true;
  }

  isEditing(): boolean {
    return this.widget.isEditing();
  }
}

export interface AdoptedStyleSheetContentsViewInput {
  isEditing: boolean;
  onDblClick: (event: MouseEvent) => void;
}

export type AdoptedStyleSheetContentsView =
    (input: AdoptedStyleSheetContentsViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_ADOPTED_STYLESHEET_CONTENTS_VIEW: AdoptedStyleSheetContentsView =
    (input: AdoptedStyleSheetContentsViewInput, _output: undefined, target: HTMLElement): void => {
      // clang-format off
      render(html`
        <span class="webkit-html-text-node webkit-html-css-node"
              jslog=${VisualLogging.value('css-text-node').track({
                change: true,
                dblclick: true,
              })}
              @dblclick=${input.onDblClick}></span>
      `, target);
      // clang-format on
    };

export class AdoptedStyleSheetContentsWidget extends UI.Widget.Widget {
  #styleSheetHeader?: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
  #text = '';
  #fetchContentPromise: Promise<void>|null = null;
  #editing: EditorHandles|null = null;
  #view: AdoptedStyleSheetContentsView;

  constructor(element?: HTMLElement, view: AdoptedStyleSheetContentsView = DEFAULT_ADOPTED_STYLESHEET_CONTENTS_VIEW) {
    super(element, {useShadowDom: false});
    this.#view = view;
  }

  get text(): string {
    return this.#text;
  }

  set styleSheetHeader(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader|undefined) {
    if (this.#styleSheetHeader === header) {
      return;
    }
    if (this.#styleSheetHeader) {
      this.#styleSheetHeader.cssModel().removeEventListener(SDK.CSSModel.Events.StyleSheetChanged,
                                                            this.#onStyleSheetChanged, this);
    }
    this.#styleSheetHeader = header;
    this.#text = '';
    if (this.isShowing() && this.#styleSheetHeader) {
      this.#styleSheetHeader.cssModel().addEventListener(SDK.CSSModel.Events.StyleSheetChanged,
                                                         this.#onStyleSheetChanged, this);
      void this.fetchContent();
    }
  }

  get styleSheetHeader(): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader|undefined {
    return this.#styleSheetHeader;
  }

  override wasShown(): void {
    super.wasShown();
    if (this.#styleSheetHeader) {
      this.#styleSheetHeader.cssModel().addEventListener(SDK.CSSModel.Events.StyleSheetChanged,
                                                         this.#onStyleSheetChanged, this);
      if (!this.#text) {
        void this.fetchContent();
      }
    }
  }

  override willHide(): void {
    super.willHide();
    if (this.#editing) {
      this.#editing.cancel();
      this.#editing = null;
    }
    if (this.#styleSheetHeader) {
      this.#styleSheetHeader.cssModel().removeEventListener(SDK.CSSModel.Events.StyleSheetChanged,
                                                            this.#onStyleSheetChanged, this);
    }
  }

  async fetchContent(): Promise<void> {
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
      } finally {
        this.#fetchContentPromise = null;
      }
    })();
    return await this.#fetchContentPromise;
  }

  #onStyleSheetChanged({data: {styleSheetId}}:
                           Common.EventTarget.EventTargetEvent<SDK.CSSModel.StyleSheetChangedEvent>): void {
    if (styleSheetId === this.#styleSheetHeader?.id) {
      void this.fetchContent();
    }
  }

  startEditing(target?: Element): void {
    if (this.#editing || !this.#styleSheetHeader) {
      return;
    }
    const textNode = (target ? (target as HTMLElement).enclosingNodeOrSelfWithClass('webkit-html-text-node') : null) ??
        this.contentElement.querySelector('.webkit-html-text-node');
    if (!textNode || UI.UIUtils.isBeingEdited(textNode)) {
      return;
    }
    const dummyEditorHandles: EditorHandles = {
      commit: () => {},
      cancel: () => {},
      resize: () => {},
    };
    this.#editing = dummyEditorHandles;

    void (async () => {
      if (!this.#styleSheetHeader) {
        this.#editing = null;
        return;
      }
      const data = await this.#styleSheetHeader.requestContentData();
      textNode.textContent = (TextUtils.ContentData.ContentData.isError(data) || !data.isTextContent) ? '' : data.text;

      const config = new UI.InplaceEditor.Config(
          (element, newText, oldText) => this.#editingCommitted(element, newText, oldText),
          () => this.#editingCancelled(),
          undefined,
      );
      const editorHandles = UI.InplaceEditor.InplaceEditor.startEditing(textNode, config);
      if (!editorHandles) {
        this.#editing = null;
        return;
      }
      this.#editing = {
        commit: editorHandles.commit,
        cancel: editorHandles.cancel,
        resize: () => {},
      };
      const selection = this.contentElement.getComponentSelection();
      selection?.selectAllChildren(textNode);
    })();
  }

  async #editingCommitted(_element: Element, newText: string, oldText: string|null): Promise<void> {
    this.#editing = null;
    if (newText !== oldText && this.#styleSheetHeader) {
      await this.#styleSheetHeader.cssModel().setStyleSheetText(this.#styleSheetHeader.id, newText, false);
    }
    this.#editingCancelled();
  }

  #editingCancelled(): void {
    this.#editing = null;
    void this.fetchContent();
  }

  isEditing(): boolean {
    return this.#editing !== null;
  }

  override performUpdate(): void {
    if (this.isEditing()) {
      return;
    }
    this.#view({
      isEditing: this.isEditing(),
      onDblClick: (event: MouseEvent) => {
        event.stopPropagation();
        this.startEditing(event.target as Element);
      },
    },
               undefined, this.contentElement);
    const textSpan = this.contentElement.querySelector<HTMLElement>('.webkit-html-text-node');
    if (textSpan) {
      textSpan.textContent = this.#text;
      void CodeHighlighter.CodeHighlighter.highlightNode(textSpan, 'text/css');
    }
  }
}
