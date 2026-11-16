// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../kit/kit.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../components/buttons/buttons.js';
import {Directives, html, nothing, render} from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import infobarStyles from './infobar.css.js';
import {createShadowRootWithCoreStyles} from './UIUtils.js';
import type {Widget} from './Widget.js';

const {ifDefined} = Directives;

const UIStrings = {
  /**
   * @description Button text to permanently dismiss an infobar and prevent it from appearing again.
   */
  dontShowAgain: 'Don’t show again',
  /**
   * @description Accessible label for the close button in an infobar.
   */
  close: 'Close',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Infobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  type: Type;
  text: string;
  actions?: InfobarAction[];
  hasDisableSetting: boolean;
  jslogContext?: string;
  detailsRows: Array<Element|string>;
  onDisable: () => void;
  onAction: (action: InfobarAction) => void;
  onDismiss: () => void;
}

export type View = (input: ViewInput, output: undefined, target: ShadowRoot) => void;

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: ShadowRoot): void => {
  const defaultActionButtonVariant =
      input.hasDisableSetting ? Buttons.Button.Variant.TONAL : Buttons.Button.Variant.OUTLINED;
  // clang-format off
  const mainRow = html`
    <div class="infobar-main-row">
      <div class="infobar-info-container">
        <div class="infobar-info-message">
          <div class="infobar-info-text" role="alert" aria-live="polite">${input.text}</div>
        </div>
        <div class="infobar-info-actions">
          ${input.hasDisableSetting ? html`
            <devtools-button
                class="infobar-button"
                .variant=${Buttons.Button.Variant.OUTLINED}
                .jslogContext=${'dont-show-again'}
                @click=${input.onDisable}>${i18nString(UIStrings.dontShowAgain)}</devtools-button>` : nothing}
          ${input.actions ? input.actions.map(action => html`
            <devtools-button
                class="infobar-button"
                .variant=${action.buttonVariant ?? defaultActionButtonVariant}
                .jslogContext=${action.jslogContext}
                @click=${() => input.onAction(action)}>${action.text}</devtools-button>`) : nothing}
        </div>
      </div>
    </div>`;
  // clang-format on

  const onKeyDown = (event: KeyboardEvent): void => {
    if (Platform.KeyboardUtilities.isEscKey(event)) {
      input.onDismiss();
      event.consume();
    }
  };

  const jslog = input.jslogContext ?
      `${VisualLogging.dialog(input.jslogContext).track({resize: true, keydown: 'Enter|Escape'})}` :
      undefined;

  // clang-format off
  render(html`
    <div
        class=${`infobar infobar-${input.type}`}
        role=${ifDefined(input.actions ? 'group' : undefined)}
        tabindex=${ifDefined(input.type !== Type.ISSUE ? 0 : undefined)}
        aria-label=${input.text}
        @keydown=${onKeyDown}>
      <div class="icon-container">
        <devtools-icon class=${`${input.type}-icon`} name=${TYPE_TO_ICON[input.type]}></devtools-icon>
      </div>
      ${input.detailsRows.length > 0 ? html`
        <details>
          <summary>
            <div class="icon-container">
              <devtools-icon name="arrow-drop-down"></devtools-icon>
            </div>
            ${mainRow}
          </summary>
          <div class="infobar-details-rows">
            ${input.detailsRows.map(message => html`
              <div class="infobar-details-row"><span class="infobar-row-message">${message}</span></div>`)}
          </div>
        </details>` : mainRow}
      <dt-close-button
          class="icon-container"
          aria-description=${i18nString(UIStrings.close)}
          .tabbable=${true}
          .size=${Buttons.Button.Size.SMALL}
          @click=${input.onDismiss}></dt-close-button>
    </div>`,
    target,
    {
      container: {
        classes: ['flex-none'],
        ...(jslog ? {attributes: {jslog}} : {}),
      },
    });
  // clang-format on
};

export class Infobar {
  element: HTMLElement;
  readonly #shadowRoot: ShadowRoot;
  readonly #type: Type;
  #text: string;
  readonly #actions?: InfobarAction[];
  readonly #disableSetting: Common.Settings.Setting<boolean>|null;
  readonly #jslogContext?: string;
  readonly #view: View;
  readonly #detailsRows: Array<Element|string> = [];
  #closeCallback: (() => void)|null = null;
  #parentView?: Widget;

  constructor(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>,
              jslogContext?: string, view: View = DEFAULT_VIEW) {
    this.element = document.createElement('div');
    this.#shadowRoot = createShadowRootWithCoreStyles(this.element, {cssFile: infobarStyles});
    this.#type = type;
    this.#text = text;
    this.#actions = actions;
    this.#disableSetting = disableSetting || null;
    this.#jslogContext = jslogContext;
    this.#view = view;
    this.#render();
  }

  static create(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>,
                jslogContext?: string, view: View = DEFAULT_VIEW): Infobar|null {
    if (disableSetting?.get()) {
      return null;
    }
    return new Infobar(type, text, actions, disableSetting, jslogContext, view);
  }

  dispose(): void {
    this.element.remove();
    this.#onResize();
    if (this.#closeCallback) {
      this.#closeCallback.call(null);
    }
  }

  setText(text: string): void {
    this.#text = text;
    this.#render();
    this.#onResize();
  }

  setCloseCallback(callback: (() => void)|null): void {
    this.#closeCallback = callback;
  }

  setParentView(parentView: Widget): void {
    this.#parentView = parentView;
  }

  #render(): void {
    this.#view(
        {
          type: this.#type,
          text: this.#text,
          actions: this.#actions,
          hasDisableSetting: Boolean(this.#disableSetting),
          jslogContext: this.#jslogContext,
          detailsRows: this.#detailsRows,
          onDisable: this.#onDisable.bind(this),
          onAction: this.#onAction.bind(this),
          onDismiss: this.dispose.bind(this),
        },
        undefined,
        this.#shadowRoot,
    );
  }

  #onAction(action: InfobarAction): void {
    if (action.delegate) {
      action.delegate();
    }
    if (action.dismiss) {
      this.dispose();
    }
  }

  #onResize(): void {
    if (this.#parentView) {
      this.#parentView.doResize();
    }
  }

  #onDisable(): void {
    if (this.#disableSetting) {
      this.#disableSetting.set(true);
    }
    this.dispose();
  }

  createDetailsRowMessage(message: Element|string): void {
    this.#detailsRows.push(message);
    this.#render();
  }
}
export interface InfobarAction {
  text: string;
  delegate: (() => void)|null;
  dismiss: boolean;
  buttonVariant?: Buttons.Button.Variant;
  jslogContext?: string;
}

export const enum Type {
  WARNING = 'warning',
  INFO = 'info',
  ISSUE = 'issue',
  ERROR = 'error',
}

const TYPE_TO_ICON = {
  [Type.WARNING]: 'warning',
  [Type.INFO]: 'info',
  [Type.ISSUE]: 'issue-text-filled',
  [Type.ERROR]: 'cross-circle',
};
