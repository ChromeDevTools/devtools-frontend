// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Buttons from '../../../components/buttons/buttons.js';
import * as Lit from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';

import linkSwatchStylesRaw from './linkSwatch.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const linkSwatchStyles = new CSSStyleSheet();
linkSwatchStyles.replaceSync(linkSwatchStylesRaw.cssContent);
const textButtonStyles = new CSSStyleSheet();
textButtonStyles.replaceSync(Buttons.textButtonStyles.cssContent);

const UIStrings = {
  /**
   *@description Text displayed in a tooltip shown when hovering over a var() CSS function in the Styles pane when the custom property in this function does not exist. The parameter is the name of the property.
   *@example {--my-custom-property-name} PH1
   */
  sIsNotDefined: '{PH1} is not defined',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/inline_editor/LinkSwatch.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html, Directives: {ifDefined, classMap}} = Lit;

export interface BaseLinkSwatchRenderData {
  text: string;
  title: string;
  showTitle: boolean;
  isDefined: boolean;
  onLinkActivate: (linkText: string) => void;
}

class BaseLinkSwatch extends HTMLElement {
  protected readonly shadow = this.attachShadow({mode: 'open'});
  protected onLinkActivate: (linkText: string, event: MouseEvent|KeyboardEvent) => void = () => undefined;
  #linkElement: HTMLSpanElement|undefined;

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [linkSwatchStyles, textButtonStyles];
    this.tabIndex = -1;
    this.addEventListener('focus', () => {
      const link = this.shadow.querySelector<HTMLElement>('[role="link"]');

      if (link) {
        link.focus();
      }
    });
  }

  set data(data: BaseLinkSwatchRenderData) {
    this.onLinkActivate = (linkText: string, event: MouseEvent|KeyboardEvent) => {
      if (event instanceof MouseEvent && event.button !== 0) {
        return;
      }
      if (event instanceof KeyboardEvent && event.key !== Platform.KeyboardUtilities.ENTER_KEY && event.key !== ' ') {
        return;
      }

      data.onLinkActivate(linkText);
      event.consume(true);
    };
    data.showTitle = data.showTitle === undefined ? true : data.showTitle;
    this.render(data);
  }

  get linkElement(): HTMLElement|undefined {
    return this.#linkElement;
  }

  private render(data: BaseLinkSwatchRenderData): void {
    const {isDefined, text, title} = data;
    const classes = classMap({
      'link-style': true,
      'text-button': true,
      'link-swatch-link': true,
      undefined: !isDefined,
    });
    // The linkText's space must be removed, otherwise it cannot be triggered when clicked.
    const onActivate = isDefined ? this.onLinkActivate.bind(this, text.trim()) : null;

    // We added var popover, so don't need the title attribute when no need for showing title and
    // only provide the data-title for the popover to get the data.
    const {startNode} = render(
        html`<button .disabled=${!isDefined} class=${classes}
        type="button"
        title=${ifDefined(data.showTitle ? title : undefined)}
        data-title=${ifDefined(!data.showTitle ? title : undefined)}
        @keydown=${onActivate}  @click=${onActivate} role="link" tabindex="-1">${text}</button>`,
        this.shadow, {host: this});
    if (startNode?.nextSibling instanceof HTMLButtonElement) {
      this.#linkElement = startNode?.nextSibling;
    }
  }
}

export interface LinkSwatchRenderData {
  isDefined: boolean;
  text: string;
  onLinkActivate: (linkText: string) => void;
  jslogContext: string;
}

export class LinkSwatch extends HTMLElement {
  protected readonly shadow = this.attachShadow({mode: 'open'});

  set data(data: LinkSwatchRenderData) {
    this.render(data);
  }

  protected render(data: LinkSwatchRenderData): void {
    const {text, isDefined, onLinkActivate, jslogContext} = data;
    const title = isDefined ? text : i18nString(UIStrings.sIsNotDefined, {PH1: text});
    render(
        html`<span title=${data.text} jslog=${
            VisualLogging.link().track({click: true}).context(jslogContext)}><devtools-base-link-swatch .data=${{
          text,
          isDefined,
          title,
          onLinkActivate,
        } as BaseLinkSwatchRenderData}></devtools-base-link-swatch></span>`,
        this.shadow, {host: this});
  }
}

customElements.define('devtools-base-link-swatch', BaseLinkSwatch);
customElements.define('devtools-link-swatch', LinkSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-base-link-swatch': BaseLinkSwatch;
    'devtools-link-swatch': LinkSwatch;
  }
}
