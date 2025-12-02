// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Badges from '../../../models/badges/badges.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Models from '../models/models.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import {ControlButton} from './ControlButton.js';
import createRecordingViewStyles from './createRecordingView.css.js';

const {html, Directives: {ref, createRef, repeat}} = Lit;

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
  name: string;
  selectorAttribute: string;
  selectorTypes: Array<{
    selectorType: Models.Schema.SelectorType,
    checked: boolean,
  }>;
  error?: Error;
  onRecordingStarted: () => void;
  onRecordingCancelled: () => void;
  onErrorReset: () => void;
  onUpdate: (update: {
    selectorType: Models.Schema.SelectorType,
    checked: boolean,
  }|{
    name: string,
  }|{
    selectorAttribute: string,
  }) => void;
}

export interface ViewOutput {
  focusInput?: () => void;
}

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const {
    name,
    selectorAttribute,
    selectorTypes,
    error,
    onUpdate,
    onRecordingStarted,
    onRecordingCancelled,
    onErrorReset
  } = input;

  const nameInputRef = createRef<HTMLInputElement>();

  const onKeyDown = (event: KeyboardEvent): void => {
    if (error) {
      onErrorReset();
    }

    const keyboardEvent = event;
    if (keyboardEvent.key === 'Enter') {
      onRecordingStarted();
      event.stopPropagation();
      event.preventDefault();
    }
  };

  output.focusInput = () => {
    nameInputRef.value?.focus();
  };

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
          value=${name}
          @focus=${() => nameInputRef.value?.select()}
          @keydown=${onKeyDown}
          jslog=${VisualLogging.textField('user-flow-name').track({change: true})}
          class="devtools-text-input"
          id="user-flow-name"
          ${ref(nameInputRef)}
          @input=${(e:Event) => onUpdate({
            name: (e.target as HTMLInputElement).value.trim()
          })}
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
          value=${selectorAttribute}
          placeholder="data-testid"
          @keydown=${onKeyDown}
          jslog=${VisualLogging.textField('selector-attribute').track({change: true})}
          class="devtools-text-input"
          id="selector-attribute"
          @input=${(e:Event) => onUpdate({
            selectorAttribute: (e.target as HTMLInputElement).value.trim()
          })}
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
          ${repeat(selectorTypes, item => {
            return html`
              <label class="checkbox-label selector-type">
                <input
                  @keydown=${onKeyDown}
                  .value=${item.selectorType}
                  jslog=${VisualLogging.toggle().track({click: true}).context(`selector-${item.selectorType}`)}
                  ?checked=${item.checked}
                  type="checkbox"
                  @change=${(e:Event) => onUpdate({
                    selectorType: item.selectorType,
                    checked: (e.target as HTMLInputElement).checked
                  })}
                />
                ${selectorTypeToLabel.get(item.selectorType) || item.selectorType}
              </label>
            `;
          })}
        </div>
        ${
          error &&
          html` <div class="error" role="alert"> ${error.message} </div>`
        }
      </div>
      <div class="footer">
        <div class="controls">
          <devtools-widget
            class="control-button"
            .widgetConfig=${UI.Widget.widgetConfig(ControlButton, {
              label: i18nString(UIStrings.startRecording),
              shape: 'circle',
              onClick: onRecordingStarted,
            })}
            jslog=${VisualLogging.action(Actions.RecorderActions.START_RECORDING).track({click: true})}
            title=${Models.Tooltip.getTooltipForActions(
              i18nString(UIStrings.startRecording),
              Actions.RecorderActions.START_RECORDING,
            )}
          ></devtools-widget>
        </div>
      </div>
    `,
    target,
  );
  // clang-format on
};

export class CreateRecordingView extends UI.Widget.Widget {
  #error?: Error;
  #name = '';
  #selectorAttribute = '';
  #selectorTypes: Array<{
    selectorType: Models.Schema.SelectorType,
    checked: boolean,
  }> = [];
  #view: typeof DEFAULT_VIEW;
  #output: ViewOutput = {};
  #recorderSettings?: Models.RecorderSettings.RecorderSettings;

  onRecordingStarted:
      (data: {name: string, selectorTypesToRecord: Models.Schema.SelectorType[], selectorAttribute?: string}) => void =
          () => {};
  onRecordingCancelled = (): void => {};

  set recorderSettings(value: Models.RecorderSettings.RecorderSettings) {
    this.#recorderSettings = value;
    this.#name = this.#recorderSettings.defaultTitle;
    this.#selectorAttribute = this.#recorderSettings.selectorAttribute;
    this.#selectorTypes = Object.values(Models.Schema.SelectorType).map(selectorType => {
      return {
        selectorType,
        checked: this.#recorderSettings?.getSelectorByType(selectorType) ?? true,
      };
    }),
    this.requestUpdate();
  }

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view || DEFAULT_VIEW;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    void this.updateComplete.then(() => this.#output.focusInput?.());
  }

  startRecording(): void {
    if (!this.#recorderSettings) {
      throw new Error('settings not set');
    }

    if (!this.#name.trim()) {
      this.#error = new Error(i18nString(UIStrings.recordingNameIsRequired));
      this.requestUpdate();
      return;
    }

    const selectorTypesToRecord = this.#selectorTypes.filter(item => item.checked).map(item => item.selectorType);

    if (!selectorTypesToRecord.includes(Models.Schema.SelectorType.CSS) &&
        !selectorTypesToRecord.includes(Models.Schema.SelectorType.XPath) &&
        !selectorTypesToRecord.includes(Models.Schema.SelectorType.Pierce)) {
      this.#error = new Error(i18nString(UIStrings.includeNecessarySelectors));
      this.requestUpdate();
      return;
    }

    for (const selectorType of Object.values(Models.Schema.SelectorType)) {
      this.#recorderSettings.setSelectorByType(
          selectorType,
          selectorTypesToRecord.includes(selectorType),
      );
    }

    const selectorAttribute = this.#selectorAttribute.trim();
    if (selectorAttribute) {
      this.#recorderSettings.selectorAttribute = selectorAttribute;
    }

    this.onRecordingStarted({
      name: this.#name,
      selectorTypesToRecord,
      selectorAttribute: this.#selectorAttribute ? this.#selectorAttribute : undefined,
    });

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.RECORDER_RECORDING_STARTED);
  }

  override performUpdate(): void {
    this.#view(
        {
          name: this.#name,
          selectorAttribute: this.#selectorAttribute,
          selectorTypes: this.#selectorTypes,
          error: this.#error,
          onRecordingCancelled: this.onRecordingCancelled,
          onUpdate: update => {
            if ('name' in update) {
              this.#name = update.name;
            } else if ('selectorAttribute' in update) {
              this.#selectorAttribute = update.selectorAttribute;
            } else {
              this.#selectorTypes = this.#selectorTypes.map(item => {
                if (item.selectorType === update.selectorType) {
                  return {
                    ...item,
                    checked: update.checked,
                  };
                }
                return item;
              });
            }
            this.requestUpdate();
          },
          onRecordingStarted: (): void => {
            this.startRecording();
          },
          onErrorReset: () => {
            this.#error = undefined;
            this.requestUpdate();
          },
        },
        this.#output, this.contentElement);
  }
}
