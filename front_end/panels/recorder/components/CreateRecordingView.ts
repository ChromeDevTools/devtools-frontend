// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';
import './ControlButton.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Badges from '../../../models/badges/badges.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Models from '../models/models.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import createRecordingViewStyles from './createRecordingView.css.js';

const {html, Directives: {ifDefined, ref, createRef}} = Lit;

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
   * that should be used during the recording.
   */
  selectorTypes: 'Selector types to record',
  /**
   * @description The error message that shows up if the user turns off
   * necessary selectors.
   */
  includeNecessarySelectors:
      'You must choose CSS, Pierce, or XPath as one of your options. Only these selectors are guaranteed to be recorded since ARIA and text selectors may not be unique.',
  /**
   * @description Title of a link to the developer documentation.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/CreateRecordingView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  defaultRecordingName: string;
  recorderSettings?: Models.RecorderSettings.RecorderSettings;
  error?: Error;
  startRecording: (name: string, selectorTypes: Models.Schema.SelectorType[], selectorAttribute?: string) => void;
  onRecordingCancelled: () => void;
  resetError: () => void;
}

export interface ViewOutput {
  focusInput?: () => void;
  triggerFormSubmission?: () => void;
}

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const {defaultRecordingName, recorderSettings, error, startRecording, onRecordingCancelled, resetError} = input;

  // TODO(crbug.com/455531160): move state from input elements into the presenter widget.
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
  function getSelectorTypes(): Models.Schema.SelectorType[] {
    const selectorTypeElements = target.querySelectorAll(
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
    return selectorTypesToRecord;
  }

  const selectorAttributeInputRef = createRef<HTMLInputElement>();

  function getSelectorAttribute(): string|undefined {
    const selectorAttribute = selectorAttributeInputRef.value?.value.trim();
    if (!selectorAttribute) {
      return undefined;
    }
    return selectorAttribute;
  }

  const nameInputRef = createRef<HTMLInputElement>();

  function handleStartRecording(): void {
    startRecording(nameInputRef.value?.value ?? '', getSelectorTypes(), getSelectorAttribute());
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (error) {
      resetError();
    }

    const keyboardEvent = event;
    if (keyboardEvent.key === 'Enter') {
      handleStartRecording();
      event.stopPropagation();
      event.preventDefault();
    }
  };

  const onInputFocus = (): void => {
    nameInputRef.value?.select();
  };

  output.focusInput = () => {
    nameInputRef.value?.focus();
  };

  output.triggerFormSubmission = () => {
    handleStartRecording();
  };

  // clang-format off
  Lit.render(
    html`
      <style>${createRecordingViewStyles}</style>
      <style>${Input.textInputStyles}</style>
      <style>${Input.checkboxStyles}</style>
      <div class="wrapper" jslog=${VisualLogging.section('create-recording-view')}>
        <div class="header-wrapper">
          <h1>${i18nString(UIStrings.createRecording)}</h1>
          <devtools-button
            title=${i18nString(UIStrings.cancelRecording)}
            jslog=${VisualLogging.close().track({click: true})}
            .data=${
              {
                variant: Buttons.Button.Variant.ICON,
                size: Buttons.Button.Size.SMALL,
                iconName: 'cross',
              } as Buttons.Button.ButtonData
            }
            @click=${onRecordingCancelled}
          ></devtools-button>
        </div>
        <label class="row-label" for="user-flow-name">${i18nString(
          UIStrings.recordingName,
        )}</label>
        <input
          value=${defaultRecordingName}
          @focus=${onInputFocus}
          @keydown=${onKeyDown}
          jslog=${VisualLogging.textField('user-flow-name').track({change: true})}
          class="devtools-text-input"
          id="user-flow-name"
          ${ref(nameInputRef)}
        />
        <label class="row-label" for="selector-attribute">
          <span>${i18nString(UIStrings.selectorAttribute)}</span>
          <x-link
            class="link" href="https://g.co/devtools/recorder#selector"
            title=${i18nString(UIStrings.learnMore)}
            jslog=${VisualLogging.link('recorder-selector-help').track({click: true})}>
            <devtools-icon name="help">
            </devtools-icon>
          </x-link>
        </label>
        <input
          value=${ifDefined(recorderSettings?.selectorAttribute)}
          placeholder="data-testid"
          @keydown=${onKeyDown}
          jslog=${VisualLogging.textField('selector-attribute').track({change: true})}
          class="devtools-text-input"
          id="selector-attribute"
          ${ref(selectorAttributeInputRef)}
        />
        <label class="row-label">
          <span>${i18nString(UIStrings.selectorTypes)}</span>
          <x-link
            class="link" href="https://g.co/devtools/recorder#selector"
            title=${i18nString(UIStrings.learnMore)}
            jslog=${VisualLogging.link('recorder-selector-help').track({click: true})}>
            <devtools-icon name="help">
            </devtools-icon>
          </x-link>
        </label>
        <div class="checkbox-container">
          ${Object.values(Models.Schema.SelectorType).map(selectorType => {
            const checked =
              recorderSettings?.getSelectorByType(selectorType);
            return html`
                <label class="checkbox-label selector-type">
                  <input
                    @keydown=${onKeyDown}
                    .value=${selectorType}
                    jslog=${VisualLogging.toggle().track({click: true}).context(`selector-${selectorType}`)}
                    ?checked=${checked}
                    type="checkbox"
                  />
                  ${selectorTypeToLabel.get(selectorType) || selectorType}
                </label>
              `;
          })}
        </div>

        ${
          error &&
          html`
        <div class="error" role="alert">
          ${error.message}
        </div>
      `
        }
      </div>
      <div class="footer">
        <div class="controls">
          <devtools-control-button
            @click=${handleStartRecording}
            .label=${i18nString(UIStrings.startRecording)}
            .shape=${'circle'}
            jslog=${VisualLogging.action(Actions.RecorderActions.START_RECORDING).track({click: true})}
            title=${Models.Tooltip.getTooltipForActions(
              i18nString(UIStrings.startRecording),
              Actions.RecorderActions.START_RECORDING,
            )}
          ></devtools-control-button>
        </div>
      </div>
    `,
    target,
  );
  // clang-format on
};

export class CreateRecordingView extends UI.Widget.Widget {
  #error?: Error;
  #view: typeof DEFAULT_VIEW;
  #output: ViewOutput = {};

  onRecordingStarted:
      (data: {name: string, selectorTypesToRecord: Models.Schema.SelectorType[], selectorAttribute?: string}) => void =
          () => {};
  onRecordingCancelled = (): void => {};
  recorderSettings?: Models.RecorderSettings.RecorderSettings;
  defaultRecordingName = '';

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view || DEFAULT_VIEW;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    void this.updateComplete.then(() => this.#output.focusInput?.());
  }

  triggerFormSubmission(): void {
    this.#output.triggerFormSubmission?.();
  }

  override performUpdate(): void {
    this.#view(
        {
          defaultRecordingName: this.defaultRecordingName,
          recorderSettings: this.recorderSettings,
          error: this.#error,
          onRecordingCancelled: this.onRecordingCancelled,
          startRecording:
              (name: string, selectorTypesToRecord: Models.Schema.SelectorType[], selectorAttribute?: string): void => {
                if (!this.recorderSettings) {
                  throw new Error('settings not set');
                }

                if (!name.trim()) {
                  this.#error = new Error(i18nString(UIStrings.recordingNameIsRequired));
                  this.requestUpdate();
                  return;
                }

                if (!selectorTypesToRecord.includes(Models.Schema.SelectorType.CSS) &&
                    !selectorTypesToRecord.includes(Models.Schema.SelectorType.XPath) &&
                    !selectorTypesToRecord.includes(Models.Schema.SelectorType.Pierce)) {
                  this.#error = new Error(i18nString(UIStrings.includeNecessarySelectors));
                  this.requestUpdate();
                  return;
                }

                for (const selectorType of Object.values(Models.Schema.SelectorType)) {
                  this.recorderSettings.setSelectorByType(
                      selectorType,
                      selectorTypesToRecord.includes(selectorType),
                  );
                }

                if (selectorAttribute) {
                  this.recorderSettings.selectorAttribute = selectorAttribute;
                }

                this.onRecordingStarted({
                  name,
                  selectorTypesToRecord,
                  selectorAttribute,
                });

                Badges.UserBadges.instance().recordAction(Badges.BadgeAction.RECORDER_RECORDING_STARTED);
              },
          resetError: () => {
            this.#error = undefined;
            this.requestUpdate();
          },
        },
        this.#output, this.contentElement);
  }
}
