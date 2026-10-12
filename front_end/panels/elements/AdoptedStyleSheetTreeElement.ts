// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {EditorHandles} from './ElementsTreeElement.js';

const {Directives: {ref}, html, render} = Lit;

export interface AdoptedStyleSheetContentsViewInput {
  text: string;
  isEditing: boolean;
  onDblClick: (event: MouseEvent) => void;
}

export type AdoptedStyleSheetContentsView =
    (input: AdoptedStyleSheetContentsViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_ADOPTED_STYLESHEET_CONTENTS_VIEW: AdoptedStyleSheetContentsView =
    (input: AdoptedStyleSheetContentsViewInput, _output: undefined, target: HTMLElement): void => {
      const highlightNode = ref(el => {
        if (el) {
          el.textContent = input.text;
          void CodeHighlighter.CodeHighlighter.highlightNode(el, 'text/css');
        }
      });
      // clang-format off
      render(html`
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
      text: this.#text,
      isEditing: this.isEditing(),
      onDblClick: (event: MouseEvent) => {
        event.stopPropagation();
        this.startEditing(event.target as Element);
      },
    },
               undefined, this.contentElement);
  }
}
