// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../kit/kit.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../components/buttons/buttons.js';
import {Directives, html, type LitTemplate, nothing, render} from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import infobarStyles from './infobar.css.js';
import {Widget, WidgetElement} from './Widget.js';

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

export type DetailsRowMessage = Element|string|LitTemplate;

export interface ViewInput {
  type: Type;
  text: string;
  actions?: InfobarAction[];
  hasDisableSetting: boolean;
  jslogContext?: string;
  detailsRows: readonly DetailsRowMessage[];
  onDisable: () => void;
  onAction: (action: InfobarAction) => void;
  onDismiss: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|ShadowRoot) => void;

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement|ShadowRoot): void => {
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
    <style>${infobarStyles}</style>
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

export class Infobar extends Widget<ShadowRoot> {
  #type: Type;
  #text: string;
  #actions?: InfobarAction[];
  #disableSetting: Common.Settings.Setting<boolean>|null;
  #jslogContext?: string;
  readonly #view: View;
  #detailsRows: readonly DetailsRowMessage[] = [];
  #closeCallback: (() => void)|null = null;
  #parentView?: Widget;
  #needsUpdate = true;

  constructor(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>,
              jslogContext?: string, view?: View);
  constructor(element?: HTMLElement, view?: View);
  constructor(typeOrElement?: Type|HTMLElement, textOrView?: string|View, actions?: InfobarAction[],
              disableSetting?: Common.Settings.Setting<boolean>, jslogContext?: string, view: View = DEFAULT_VIEW) {
    if (typeof typeOrElement === 'string') {
      super(undefined, {useShadowDom: 'pure'});
      this.#type = typeOrElement;
      this.#text = typeof textOrView === 'string' ? textOrView : '';
      this.#actions = actions;
      this.#disableSetting = disableSetting || null;
      this.#jslogContext = jslogContext;
      this.#view = view;
      // Flush initial render synchronously for legacy positional callers such as OverlaysImpl
      // (#positionInfoBarBanner) that measure clientHeight immediately and synchronous DOM unit tests.
      this.performUpdate();
    } else {
      super(typeOrElement, {useShadowDom: 'pure'});
      this.#type = Type.INFO;
      this.#text = '';
      this.#disableSetting = null;
      this.#view = typeof textOrView === 'function' ? textOrView : DEFAULT_VIEW;
    }
  }

  static create(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>,
                jslogContext?: string, view: View = DEFAULT_VIEW): Infobar|null {
    if (disableSetting?.get()) {
      return null;
    }
    return new Infobar(type, text, actions, disableSetting, jslogContext, view);
  }

  get type(): Type {
    return this.#type;
  }

  set type(type: Type) {
    if (this.#type === type) {
      return;
    }
    this.#type = type;
    this.#needsUpdate = true;
    this.requestUpdate();
  }

  get text(): string {
    return this.#text;
  }

  set text(text: string) {
    if (this.#text === text) {
      return;
    }
    this.#text = text;
    this.#needsUpdate = true;
    this.requestUpdate();
    void this.updateComplete.then(() => this.#onResize());
  }

  get actions(): InfobarAction[]|undefined {
    return this.#actions;
  }

  set actions(actions: InfobarAction[]|undefined) {
    if (this.#actions === actions) {
      return;
    }
    this.#actions = actions;
    this.#needsUpdate = true;
    this.requestUpdate();
  }

  get disableSetting(): Common.Settings.Setting<boolean>|null {
    return this.#disableSetting;
  }

  set disableSetting(disableSetting: Common.Settings.Setting<boolean>|null) {
    if (this.#disableSetting === disableSetting) {
      return;
    }
    this.#disableSetting = disableSetting;
    this.#needsUpdate = true;
    this.requestUpdate();
  }

  get jslogContext(): string|undefined {
    return this.#jslogContext;
  }

  set jslogContext(jslogContext: string|undefined) {
    if (this.#jslogContext === jslogContext) {
      return;
    }
    this.#jslogContext = jslogContext;
    this.#needsUpdate = true;
    this.requestUpdate();
  }

  get detailsRows(): readonly DetailsRowMessage[] {
    return this.#detailsRows;
  }

  set detailsRows(detailsRows: readonly DetailsRowMessage[]) {
    if (this.#detailsRows === detailsRows) {
      return;
    }
    this.#detailsRows = detailsRows;
    this.#needsUpdate = true;
    this.requestUpdate();
  }

  get onClose(): (() => void)|null {
    return this.#closeCallback;
  }

  set onClose(callback: (() => void)|null) {
    this.#closeCallback = callback;
  }

  dispose(): void {
    if (!(this.element instanceof WidgetElement)) {
      this.detach();
    }
    if (this.#closeCallback) {
      this.#closeCallback.call(null);
    }
  }

  setText(text: string): void {
    if (this.#text === text) {
      return;
    }
    this.#text = text;
    // TODO: migrate to `requestUpdate()` once legacy synchronous callers use declarative views.
    this.performUpdate();
    this.#onResize();
  }

  setCloseCallback(callback: (() => void)|null): void {
    this.#closeCallback = callback;
  }

  setParentView(parentView: Widget): void {
    this.#parentView = parentView;
  }

  override wasShown(): void {
    super.wasShown();
    if (this.#needsUpdate) {
      this.requestUpdate();
    }
  }

  override wasHidden(): void {
    super.wasHidden();
    this.#onResize();
  }

  override performUpdate(): void {
    this.#needsUpdate = false;
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
        this.contentElement,
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
    (this.#parentView ?? this.parentWidget())?.doResize();
  }

  #onDisable(): void {
    if (this.#disableSetting) {
      this.#disableSetting.set(true);
    }
    this.dispose();
  }

  createDetailsRowMessage(message: DetailsRowMessage): void {
    this.#detailsRows = [...this.#detailsRows, message];
    // TODO: migrate to `requestUpdate()` once legacy synchronous callers use declarative views.
    this.performUpdate();
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
