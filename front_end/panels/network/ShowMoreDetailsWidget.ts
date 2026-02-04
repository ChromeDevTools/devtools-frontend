// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
const UIStrings = {
  /**
   * @description Text to show more content
   */
  showMore: 'Show more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/ShowMoreDetailsWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = Lit;
interface ViewInput {
  text: string;
  showMore: boolean;
  onToggle: () => void;
  copy: CopyMenuItem|null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
const MAX_LENGTH = 3000;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const onContextMenuShowMore = (event: Event): void => {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (input.copy) {
      contextMenu.clipboardSection().appendItem(input.copy.menuItem, input.copy.handler);
    }
    if (!input.showMore) {
      contextMenu.newSection().appendItem(i18nString(UIStrings.showMore), input.onToggle, {jslogContext: 'show-more'});
    }
    void contextMenu.show();
  };

  render(html`<span
            @contextmenu=${onContextMenuShowMore}
            >${input.showMore ? input.text : input.text.substr(0, MAX_LENGTH)}</span>
          ${
          !input.showMore && input.text.length > MAX_LENGTH ? html`<devtools-button
            .variant=${Buttons.Button.Variant.OUTLINED}
            .jslogContext=${'show-more'}
            @click=${input.onToggle}>
            ${i18nString(UIStrings.showMore)}
          </devtools-button>` :
                                                              Lit.nothing}`,
      target);
};

interface CopyMenuItem {
  menuItem: UI.ContextMenu.Item;
  handler: () => void;
}

export class ShowMoreDetailsWidget extends UI.Widget.Widget {
  readonly #view: View;
  #text = '';
  #showMore = false;
  #copy: CopyMenuItem|null = null;
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target);
    this.#view = view;
  }

  get text(): string {
    return this.#text;
  }

  set text(text: string) {
    this.#text = text;
    this.requestUpdate();
  }

  set copy(copy: CopyMenuItem) {
    this.#copy = copy;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          copy: this.#copy,
          text: this.#text,
          showMore: this.#showMore,
          onToggle: () => {
            this.#showMore = true;
            this.requestUpdate();
          },
        },
        {}, this.contentElement);
  }
}
