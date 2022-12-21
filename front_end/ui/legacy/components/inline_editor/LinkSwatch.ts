// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

import linkSwatchStyles from './linkSwatch.css.js';

const UIStrings = {
  /**
   *@description Text displayed in a tooltip shown when hovering over a var() CSS function in the Styles pane when the custom property in this function does not exist. The parameter is the name of the property.
   *@example {--my-custom-property-name} PH1
   */
  sIsNotDefined: '{PH1} is not defined',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/inline_editor/LinkSwatch.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html, Directives} = LitHtml;

interface LinkSwatchRenderData {
  text: string;
  title: string;
  isDefined: boolean;
  onLinkActivate: (linkText: string) => void;
}

/* eslint-disable-next-line rulesdir/check_component_naming */
class LinkSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-link-swatch`;
  protected readonly shadow = this.attachShadow({mode: 'open'});
  protected onLinkActivate: (linkText: string, event: MouseEvent|KeyboardEvent) => void = () => undefined;

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [linkSwatchStyles];
  }

  set data(data: LinkSwatchRenderData) {
    this.onLinkActivate = (linkText: string, event: MouseEvent|KeyboardEvent): void => {
      if (event instanceof MouseEvent && event.button !== 0) {
        return;
      }

      if (event instanceof KeyboardEvent && !Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        return;
      }

      data.onLinkActivate(linkText);
      event.consume(true);
    };
    this.render(data);
  }

  private render(data: LinkSwatchRenderData): void {
    const {isDefined, text, title} = data;
    const classes = Directives.classMap({
      'link-swatch-link': true,
      'undefined': !isDefined,
    });
    // The linkText's space must be removed, otherwise it cannot be triggered when clicked.
    const onActivate = isDefined ? this.onLinkActivate.bind(this, text.trim()) : null;

    render(
        html`<span class=${classes} title=${title} @mousedown=${onActivate} @keydown=${
            onActivate} role="link" tabindex="-1">${text}</span>`,
        this.shadow, {host: this});
  }
}

const VARIABLE_FUNCTION_REGEX = /(^var\()\s*(--(?:[\s\w\P{ASCII}-]|\\.)+)(,?\s*.*)\s*(\))$/u;

interface CSSVarSwatchRenderData {
  text: string;
  computedValue: string|null;
  fromFallback: boolean;
  onLinkActivate: (linkText: string) => void;
}

interface ParsedVariableFunction {
  pre: string;
  variableName: string;
  fallbackIncludeComma: string;
  post: string;
}

export class CSSVarSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-var-swatch`;
  protected readonly shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();

    this.tabIndex = -1;

    this.addEventListener('focus', () => {
      const link = this.shadow.querySelector<HTMLElement>('[role="link"]');

      if (link) {
        link.focus();
      }
    });
  }

  set data(data: CSSVarSwatchRenderData) {
    this.render(data);
  }

  private parseVariableFunctionParts(text: string): ParsedVariableFunction|null {
    // When the value of CSS var() is greater than two spaces, only one is
    // always displayed, and the actual number of spaces is displayed when
    // editing is clicked.
    const result = text.replace(/\s{2,}/g, ' ').match(VARIABLE_FUNCTION_REGEX);
    if (!result) {
      return null;
    }

    return {
      // Returns `var(`
      pre: result[1],

      // Returns the CSS variable name, e.g. `--foo`
      variableName: result[2],

      // Returns the fallback value in the CSS variable, including a comma if
      // one is present, e.g. `,50px`
      fallbackIncludeComma: result[3],

      // Returns `)`
      post: result[4],
    };
  }

  private variableName(text: string): string {
    const match = text.match(VARIABLE_FUNCTION_REGEX);
    if (match) {
      return match[2];
    }
    return '';
  }

  protected render(data: CSSVarSwatchRenderData): void {
    const {text, fromFallback, computedValue, onLinkActivate} = data;
    const functionParts = this.parseVariableFunctionParts(text);
    if (!functionParts) {
      render('', this.shadow, {host: this});
      return;
    }

    const isDefined = Boolean(computedValue) && !fromFallback;
    const title = isDefined ? computedValue : i18nString(UIStrings.sIsNotDefined, {PH1: this.variableName(text)});
    const fallbackIncludeComma = functionParts.fallbackIncludeComma ? functionParts.fallbackIncludeComma : '';

    render(
        html`<span title=${data.computedValue || ''}>${functionParts.pre}<${LinkSwatch.litTagName} .data=${
            {title, text: functionParts.variableName, isDefined, onLinkActivate} as
            LinkSwatchRenderData}></${LinkSwatch.litTagName}>${fallbackIncludeComma}${functionParts.post}</span>`,
        this.shadow, {host: this});
  }
}

interface AnimationNameSwatchRenderData {
  isDefined: boolean;
  text: string;
  onLinkActivate: (linkText: string) => void;
}

export class AnimationNameSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-animation-name-swatch`;
  protected readonly shadow = this.attachShadow({mode: 'open'});

  set data(data: AnimationNameSwatchRenderData) {
    this.render(data);
  }

  protected render(data: AnimationNameSwatchRenderData): void {
    const {text, isDefined, onLinkActivate} = data;
    const title = isDefined ? text : i18nString(UIStrings.sIsNotDefined, {PH1: text});
    render(
        html`<span title=${data.text}><${LinkSwatch.litTagName} .data=${{
          text,
          isDefined,
          title,
          onLinkActivate,
        } as LinkSwatchRenderData}></${LinkSwatch.litTagName}></span>`,
        this.shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-animation-name-swatch', AnimationNameSwatch);
ComponentHelpers.CustomElements.defineComponent('devtools-css-var-swatch', CSSVarSwatch);
ComponentHelpers.CustomElements.defineComponent('devtools-link-swatch', LinkSwatch);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-link-swatch': LinkSwatch;
    'devtools-animation-name-swatch': AnimationNameSwatch;
    'devtools-css-var-swatch': CSSVarSwatch;
  }
}
