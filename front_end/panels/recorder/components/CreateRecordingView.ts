// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/inject_checkbox_styles */

import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Models from '../models/models.js';
import * as Actions from '../recorder-actions.js';  // eslint-disable-line rulesdir/es_modules_import

import createRecordingViewStyles from './createRecordingView.css.js';

const UIStrings = {
  /**
   * @description The label for the input where the user enters a name for the new recording.
   */
  recordingName: 'Recording name',
  /**
   * @description The button that start the recording with selected options.
   */
  startRecording: 'Start recording',
  /**
   * @description The title of the page that contains the form for creating a new recording.
   */
  createRecording: 'Create a new recording',
  /**
   * @description The error message that is shown if the user tries to create a recording without a name.
   */
  recordingNameIsRequired: 'Recording name is required',
  /**
   * @description The label for the input where the user enters an attribute to be used for selector generation.
   */
  selectorAttribute: 'Selector attribute',
  /**
   * @description The title for the close button where the user cancels a recording and returns back to previous view.
   */
  cancelRecording: 'Cancel recording',
  /**
   * @description Label indicating a CSS (Cascading Style Sheets) selector type
   * (https://developer.mozilla.org/en-US/docs/Web/CSS). The label is used on a
   * checkbox which users can tick if they are interesting in recording CSS
   * selectors.
   */
  selectorTypeCSS: 'CSS',
  /**
   * @description Label indicating a piercing CSS (Cascading Style Sheets)
   * selector type
   * (https://pptr.dev/guides/query-selectors#pierce-selectors-pierce). These
   * type of selectors behave like CSS selectors, but can pierce through
   * ShadowDOM. The label is used on a checkbox which users can tick if they are
   * interesting in recording CSS selectors.
   */
  selectorTypePierce: 'Pierce',
  /**
   * @description Label indicating a ARIA (Accessible Rich Internet
   * Applications) selector type
   * (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA). The
   * label is used on a checkbox which users can tick if they are interesting in
   * recording ARIA selectors.
   */
  selectorTypeARIA: 'ARIA',
  /**
   * @description Label indicating a text selector type. The label is used on a
   * checkbox which users can tick if they are interesting in recording text
   * selectors.
   */
  selectorTypeText: 'Text',
  /**
   * @description Label indicating a XPath (XML Path Language) selector type
   * (https://en.wikipedia.org/wiki/XPath). The label is used on a checkbox
   * which users can tick if they are interesting in recording text selectors.
   */
  selectorTypeXPath: 'XPath',
  /**
   * @description The label for the input that allows specifying selector types
   * that should be used during the recordering.
   */
  selectorTypes: 'Selector types to record',
  /**
   * @description The error message that shows up if the user turns off
   * necessary selectors.
   */
  includeNecessarySelectors:
      'You must choose CSS, Pierce, or XPath as one of your options. Only these selectors are guaranteed to be recorded since ARIA and text selectors may not be unique.',
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/CreateRecordingView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-create-recording-view': CreateRecordingView;
  }
  interface HTMLElementEventMap {
    recordingstarted: RecordingStartedEvent;
    recordingcancelled: RecordingCancelledEvent;
  }
}

export class RecordingStartedEvent extends Event {
  static readonly eventName = 'recordingstarted';
  name: string;
  selectorAttribute?: string;
  selectorTypesToRecord: Models.Schema.SelectorType[];

  constructor(
      name: string,
      selectorTypesToRecord: Models.Schema.SelectorType[],
      selectorAttribute?: string,
  ) {
    super(RecordingStartedEvent.eventName, {});
    this.name = name;
    this.selectorAttribute = selectorAttribute || undefined;
    this.selectorTypesToRecord = selectorTypesToRecord;
  }
}

export class RecordingCancelledEvent extends Event {
  static readonly eventName = 'recordingcancelled';
  constructor() {
    super(RecordingCancelledEvent.eventName);
  }
}

export interface CreateRecordingViewData {
  recorderSettings: Models.RecorderSettings.RecorderSettings;
}

export class CreateRecordingView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-create-recording-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #defaultRecordingName: string = '';
  #error?: Error;
  #recorderSettings?: Models.RecorderSettings.RecorderSettings;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [
      createRecordingViewStyles,
      Input.textInputStyles,
      Input.checkboxStyles,
    ];
    this.#render();
    this.#shadow.querySelector('input')?.focus();
  }

  set data(data: CreateRecordingViewData) {
    this.#recorderSettings = data.recorderSettings;
    this.#defaultRecordingName = this.#recorderSettings.defaultTitle;
  }

  #onKeyDown(event: Event): void {
    if (this.#error) {
      this.#error = undefined;
      this.#render();
    }

    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter') {
      this.startRecording();
      event.stopPropagation();
      event.preventDefault();
    }
  }

  startRecording(): void {
    const nameInput = this.#shadow.querySelector(
                          '#user-flow-name',
                          ) as HTMLInputElement;
    if (!nameInput) {
      throw new Error('input#user-flow-name not found');
    }
    if (!this.#recorderSettings) {
      throw new Error('settings not set');
    }

    if (!nameInput.value.trim()) {
      this.#error = new Error(i18nString(UIStrings.recordingNameIsRequired));
      this.#render();
      return;
    }

    const selectorTypeElements = this.#shadow.querySelectorAll(
        '.selector-type input[type=checkbox]',
    );
    const selectorTypesToRecord: Models.Schema.SelectorType[] = [];
    for (const selectorType of selectorTypeElements) {
      const checkbox = selectorType as HTMLInputElement;
      const checkboxValue = checkbox.value as Models.Schema.SelectorType;
      if (checkbox.checked) {
        selectorTypesToRecord.push(checkboxValue);
      }
    }

    if (!selectorTypesToRecord.includes(Models.Schema.SelectorType.CSS) &&
        !selectorTypesToRecord.includes(Models.Schema.SelectorType.XPath) &&
        !selectorTypesToRecord.includes(Models.Schema.SelectorType.Pierce)) {
      this.#error = new Error(i18nString(UIStrings.includeNecessarySelectors));
      this.#render();
      return;
    }

    for (const selectorType of Object.values(Models.Schema.SelectorType)) {
      this.#recorderSettings.setSelectorByType(
          selectorType,
          selectorTypesToRecord.includes(selectorType),
      );
    }

    const selectorAttributeEl = this.#shadow.querySelector(
                                    '#selector-attribute',
                                    ) as HTMLInputElement;
    const selectorAttribute = selectorAttributeEl.value.trim();
    this.#recorderSettings.selectorAttribute = selectorAttribute;

    this.dispatchEvent(
        new RecordingStartedEvent(
            nameInput.value.trim(),
            selectorTypesToRecord,
            selectorAttribute,
            ),
    );
  }

  #dispatchRecordingCancelled(): void {
    this.dispatchEvent(new RecordingCancelledEvent());
  }

  #onInputFocus = (): void => {
    (this.#shadow.querySelector('#user-flow-name') as HTMLInputElement)?.select();
  };

  #render(): void {
    const selectorTypeToLabel = new Map([
      [Models.Schema.SelectorType.ARIA, i18nString(UIStrings.selectorTypeARIA)],
      [Models.Schema.SelectorType.CSS, i18nString(UIStrings.selectorTypeCSS)],
      [Models.Schema.SelectorType.Text, i18nString(UIStrings.selectorTypeText)],
      [
        Models.Schema.SelectorType.XPath,
        i18nString(UIStrings.selectorTypeXPath),
      ],
      [
        Models.Schema.SelectorType.Pierce,
        i18nString(UIStrings.selectorTypePierce),
      ],
    ]);
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <div class="wrapper">
          <div class="header-wrapper">
            <h1>${i18nString(UIStrings.createRecording)}</h1>
            <${Buttons.Button.Button.litTagName}
              title=${i18nString(UIStrings.cancelRecording)}
              .data=${
                {
                  variant: Buttons.Button.Variant.ROUND,
                  size: Buttons.Button.Size.SMALL,
                  iconName: 'cross',
                } as Buttons.Button.ButtonData
              }
              @click=${this.#dispatchRecordingCancelled}
            ></${Buttons.Button.Button.litTagName}>
          </div>
          <label class="row-label" for="user-flow-name">${i18nString(
            UIStrings.recordingName,
          )}</label>
          <input
            value=${this.#defaultRecordingName}
            @focus=${this.#onInputFocus}
            @keydown=${this.#onKeyDown}
            class="devtools-text-input"
            id="user-flow-name"
          />
          <label class="row-label" for="selector-attribute">
            <span>${i18nString(UIStrings.selectorAttribute)}</span>
            <x-link class="link" href="https://g.co/devtools/recorder#selector">
              <${IconButton.Icon.Icon.litTagName}
                .data=${
                  {
                    iconName: 'help',
                    color: 'var(--icon-default)',
                    width: '16px',
                    height: '16px',
                  } as IconButton.Icon.IconData
                }>
              </${IconButton.Icon.Icon.litTagName}>
            </x-link>
          </label>
          <input
            value=${this.#recorderSettings?.selectorAttribute}
            placeholder="data-testid"
            @keydown=${this.#onKeyDown}
            class="devtools-text-input"
            id="selector-attribute"
          />
          <label class="row-label">
            <span>${i18nString(UIStrings.selectorTypes)}</span>
            <x-link class="link" href="https://g.co/devtools/recorder#selector">
              <${IconButton.Icon.Icon.litTagName}
                .data=${
                  {
                    iconName: 'help',
                    color: 'var(--icon-default)',
                    width: '16px',
                    height: '16px',
                  } as IconButton.Icon.IconData
                }
              ></${IconButton.Icon.Icon.litTagName}>
            </x-link>
          </label>
          <div class="checkbox-container">
            ${Object.values(Models.Schema.SelectorType).map(selectorType => {
              const checked =
                this.#recorderSettings?.getSelectorByType(selectorType);
              return LitHtml.html`
                  <label class="checkbox-label selector-type">
                    <input
                      @keydown=${this.#onKeyDown}
                      .value=${selectorType}
                      checked=${LitHtml.Directives.ifDefined(
                        checked ? checked : undefined,
                      )}
                      type="checkbox"
                    />
                    ${selectorTypeToLabel.get(selectorType) || selectorType}
                  </label>
                `;
            })}
          </div>

          ${
            this.#error &&
            LitHtml.html`
          <div class="error" role="alert">
            ${this.#error.message}
          </div>
        `
          }
        </div>
        <div class="footer">
          <div class="controls">
            <devtools-control-button
              @click=${this.startRecording}
              .label=${i18nString(UIStrings.startRecording)}
              .shape=${'circle'}
              title=${Models.Tooltip.getTooltipForActions(
                i18nString(UIStrings.startRecording),
                Actions.RecorderActions.StartRecording,
              )}
            ></devtools-control-button>
          </div>
        </div>
      `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-create-recording-view',
    CreateRecordingView,
);
