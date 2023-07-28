// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as CodeHighlighter from '../../../ui/components/code_highlighter/code_highlighter.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as TextEditor from '../../../ui/components/text_editor/text_editor.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as Menus from '../../../ui/components/menus/menus.js';

import type * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import type * as PublicExtensions from '../../../models/extensions/extensions.js';

import type * as Extensions from '../extensions/extensions.js';
import type * as Converters from '../converters/converters.js';
import * as Models from '../models/models.js';
import * as Actions from '../recorder-actions.js';  // eslint-disable-line rulesdir/es_modules_import

import recordingViewStyles from './recordingView.css.js';

import {
  State,
  StepView,
  type StepViewData,
  type CopyStepEvent,
} from './StepView.js';

import {PlayRecordingSpeed} from '../models/RecordingPlayer.js';
import {
  ReplayButton,
  type ReplayButtonData,
  type StartReplayEvent,
} from './ReplayButton.js';
import * as SplitView from '../../../ui/components/split_view/split_view.js';
import {ExtensionView} from './ExtensionView.js';

const UIStrings = {
  /**
   * @description Depicts that the recording was done on a mobile device (e.g., a smartphone or tablet).
   */
  mobile: 'Mobile',
  /**
   * @description Depicts that the recording was done on a desktop device (e.g., on a PC or laptop).
   */
  desktop: 'Desktop',
  /**
   * @description Network latency in milliseconds.
   * @example {10} value
   */
  latency: 'Latency: {value} ms',
  /**
   * @description Upload speed.
   * @example {42 kB} value
   */
  upload: 'Upload: {value}',
  /**
   * @description Download speed.
   * @example {8 kB} value
   */
  download: 'Download: {value}',
  /**
   * @description Title of the button to edit replay settings.
   */
  editReplaySettings: 'Edit replay settings',
  /**
   * @description Title of the section that contains replay settings.
   */
  replaySettings: 'Replay settings',
  /**
   * @description The string is shown when a default value is used for some replay settings.
   */
  default: 'Default',
  /**
   * @description The title of the section with environment settings.
   */
  environment: 'Environment',
  /**
   * @description The title of the screenshot image that is shown for every section in the recordign view.
   */
  screenshotForSection: 'Screenshot for this section',
  /**
   * @description The title of the button that edits the current recording's title.
   */
  editTitle: 'Edit title',
  /**
   * @description The error for when the title is missing.
   */
  requiredTitleError: 'Title is required',
  /**
   * @description The status text that is shown while the recording is ongoing.
   */
  recording: 'Recording…',
  /**
   * @description The title of the button to end the current recording.
   */
  endRecording: 'End recording',
  /**
   * @description The title of the button while the recording is being ended.
   */
  recordingIsBeingStopped: 'Stopping recording…',
  /**
   * @description The text that describes a timeout setting of {value} milliseconds.
   * @example {1000} value
   */
  timeout: 'Timeout: {value} ms',
  /**
   * @description The label for the input that allows entering network throttling configuration.
   */
  network: 'Network',
  /**
   * @description The label for the input that allows entering timeout (a number in ms) configuration.
   */
  timeoutLabel: 'Timeout',
  /**
   * @description The text in a tooltip for the timeout input that explains what timeout settings do.
   */
  timeoutExplanation:
      'The timeout setting (in milliseconds) applies to every action when replaying the recording. For example, if a DOM element identified by a CSS selector does not appear on the page within the specified timeout, the replay fails with an error.',
  /**
   * @description The label for the button that cancels replaying.
   */
  cancelReplay: 'Cancel replay',
  /**
   * @description Button title that shows the code view when clicked.
   */
  showCode: 'Show code',
  /**
   * @description Button title that hides the code view when clicked.
   */
  hideCode: 'Hide code',
  /**
   * @description Button title that adds an assertion to the step editor.
   */
  addAssertion: 'Add assertion',
  /**
   * @description The title of the button that open current recording in Performance panel.
   */
  performancePanel: 'Performance panel',
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/RecordingView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-recording-view': RecordingView;
  }
}

export interface ReplayState {
  isPlaying: boolean;             // Replay is in progress
  isPausedOnBreakpoint: boolean;  // Replay is in progress and is in stopped state
}

export interface RecordingViewData {
  replayState: ReplayState;
  isRecording: boolean;
  recordingTogglingInProgress: boolean;
  recording: Models.Schema.UserFlow;
  currentStep?: Models.Schema.Step;
  currentError?: Error;
  sections: Models.Section.Section[];
  settings?: Models.RecordingSettings.RecordingSettings;
  recorderSettings?: Models.RecorderSettings.RecorderSettings;
  lastReplayResult?: Models.RecordingPlayer.ReplayResult;
  replayAllowed: boolean;
  breakpointIndexes: Set<number>;
  builtInConverters: Converters.Converter.Converter[];
  extensionConverters: Converters.Converter.Converter[];
  replayExtensions: Extensions.ExtensionManager.Extension[];
  extensionDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;
}

export class RecordingFinishedEvent extends Event {
  static readonly eventName = 'recordingfinished';

  constructor() {
    super(RecordingFinishedEvent.eventName);
  }
}

export const enum TargetPanel {
  PerformancePanel = 'timeline',
  Default = 'chrome_recorder',
}

interface PlayRecordingEventData {
  targetPanel: TargetPanel;
  speed: PlayRecordingSpeed;
  extension?: Extensions.ExtensionManager.Extension;
}

export class PlayRecordingEvent extends Event {
  static readonly eventName = 'playrecording';
  readonly data: PlayRecordingEventData;
  constructor(
      data: PlayRecordingEventData = {
        targetPanel: TargetPanel.Default,
        speed: PlayRecordingSpeed.Normal,
      },
  ) {
    super(PlayRecordingEvent.eventName);
    this.data = data;
  }
}

export class AbortReplayEvent extends Event {
  static readonly eventName = 'abortreplay';
  constructor() {
    super(AbortReplayEvent.eventName);
  }
}

export class RecordingChangedEvent extends Event {
  static readonly eventName = 'recordingchanged';
  data: {currentStep: Models.Schema.Step, newStep: Models.Schema.Step};
  constructor(currentStep: Models.Schema.Step, newStep: Models.Schema.Step) {
    super(RecordingChangedEvent.eventName);
    this.data = {currentStep, newStep};
  }
}

export class AddAssertionEvent extends Event {
  static readonly eventName = 'addassertion';
  constructor() {
    super(AddAssertionEvent.eventName);
  }
}

export class RecordingTitleChangedEvent extends Event {
  static readonly eventName = 'recordingtitlechanged';
  title: string;

  constructor(title: string) {
    super(RecordingTitleChangedEvent.eventName, {});
    this.title = title;
  }
}

export class NetworkConditionsChanged extends Event {
  static readonly eventName = 'networkconditionschanged';
  data?: SDK.NetworkManager.Conditions;
  constructor(data?: SDK.NetworkManager.Conditions) {
    super(NetworkConditionsChanged.eventName, {
      composed: true,
      bubbles: true,
    });
    this.data = data;
  }
}

export class TimeoutChanged extends Event {
  static readonly eventName = 'timeoutchanged';
  data?: number;
  constructor(data?: number) {
    super(TimeoutChanged.eventName, {composed: true, bubbles: true});
    this.data = data;
  }
}

const networkConditionPresets = [
  SDK.NetworkManager.NoThrottlingConditions,
  SDK.NetworkManager.OfflineConditions,
  SDK.NetworkManager.Slow3GConditions,
  SDK.NetworkManager.Fast3GConditions,
];

function converterIdToFlowMetric(
    converterId: string,
    ): Host.UserMetrics.RecordingCopiedToClipboard {
  switch (converterId) {
    case Models.ConverterIds.ConverterIds.Puppeteer:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedRecordingWithPuppeteer;
    case Models.ConverterIds.ConverterIds.JSON:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedRecordingWithJSON;
    case Models.ConverterIds.ConverterIds.Replay:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedRecordingWithReplay;
    default:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedRecordingWithExtension;
  }
}

function converterIdToStepMetric(
    converterId: string,
    ): Host.UserMetrics.RecordingCopiedToClipboard {
  switch (converterId) {
    case Models.ConverterIds.ConverterIds.Puppeteer:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedStepWithPuppeteer;
    case Models.ConverterIds.ConverterIds.JSON:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedStepWithJSON;
    case Models.ConverterIds.ConverterIds.Replay:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedStepWithReplay;
    default:
      return Host.UserMetrics.RecordingCopiedToClipboard.CopiedStepWithExtension;
  }
}

export class RecordingView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-recording-view`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #replayState: ReplayState = {isPlaying: false, isPausedOnBreakpoint: false};
  #userFlow: Models.Schema.UserFlow|null = null;
  #isRecording: boolean = false;
  #recordingTogglingInProgress: boolean = false;
  #isTitleInvalid = false;
  #currentStep?: Models.Schema.Step;
  #steps: Models.Schema.Step[] = [];
  #currentError?: Error;
  #sections: Models.Section.Section[] = [];
  #settings?: Models.RecordingSettings.RecordingSettings;
  #recorderSettings?: Models.RecorderSettings.RecorderSettings;
  #lastReplayResult?: Models.RecordingPlayer.ReplayResult;
  #breakpointIndexes: Set<number> = new Set();
  #selectedStep?: Models.Schema.Step|null;

  #replaySettingsExpanded = false;
  #replayAllowed = true;
  #builtInConverters: Converters.Converter.Converter[] = [];
  #extensionConverters: Converters.Converter.Converter[] = [];
  #replayExtensions?: Extensions.ExtensionManager.Extension[];
  #showCodeView = false;
  #code: string = '';
  #converterId: string = '';
  #editorState?: CodeMirror.EditorState;
  #sourceMap: PuppeteerReplay.SourceMap|undefined;
  #extensionDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;

  #onCopyBound = this.#onCopy.bind(this);

  set data(data: RecordingViewData) {
    this.#isRecording = data.isRecording;
    this.#replayState = data.replayState;
    this.#recordingTogglingInProgress = data.recordingTogglingInProgress;
    this.#currentStep = data.currentStep;

    this.#userFlow = data.recording;
    this.#steps = this.#userFlow.steps;
    this.#sections = data.sections;
    this.#settings = data.settings;
    this.#recorderSettings = data.recorderSettings;

    this.#currentError = data.currentError;
    this.#lastReplayResult = data.lastReplayResult;
    this.#replayAllowed = data.replayAllowed;
    this.#isTitleInvalid = false;
    this.#breakpointIndexes = data.breakpointIndexes;
    this.#builtInConverters = data.builtInConverters;
    this.#extensionConverters = data.extensionConverters;
    this.#replayExtensions = data.replayExtensions;
    this.#extensionDescriptor = data.extensionDescriptor;

    this.#converterId = this.#recorderSettings?.preferredCopyFormat ?? data.builtInConverters[0]?.getId();
    void this.#convertToCode();

    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [
      recordingViewStyles,
      Input.textInputStyles,
    ];
    document.addEventListener('copy', this.#onCopyBound);
    this.#render();
  }

  disconnectedCallback(): void {
    document.removeEventListener('copy', this.#onCopyBound);
  }

  scrollToBottom(): void {
    const wrapper = this.shadowRoot?.querySelector('.sections');
    if (!wrapper) {
      return;
    }
    wrapper.scrollTop = wrapper.scrollHeight;
  }

  #dispatchAddAssertionEvent(): void {
    this.dispatchEvent(new AddAssertionEvent());
  }

  #dispatchRecordingFinished(): void {
    this.dispatchEvent(new RecordingFinishedEvent());
  }

  #handleAbortReplay(): void {
    this.dispatchEvent(new AbortReplayEvent());
  }

  #handleTogglePlaying(event: StartReplayEvent): void {
    this.dispatchEvent(
        new PlayRecordingEvent({
          targetPanel: TargetPanel.Default,
          speed: event.speed,
          extension: event.extension,
        }),
    );
  }

  #getStepState(step: Models.Schema.Step): State {
    if (!this.#currentStep) {
      return State.Default;
    }
    if (step === this.#currentStep) {
      if (this.#currentError) {
        return State.Error;
      }
      if (!this.#replayState.isPlaying) {
        return State.Success;
      }

      if (this.#replayState.isPausedOnBreakpoint) {
        return State.Stopped;
      }

      return State.Current;
    }
    const currentIndex = this.#steps.indexOf(this.#currentStep);
    if (currentIndex === -1) {
      return State.Default;
    }

    const index = this.#steps.indexOf(step);
    return index < currentIndex ? State.Success : State.Outstanding;
  }

  #getSectionState(section: Models.Section.Section): State {
    const currentStep = this.#currentStep;
    if (!currentStep) {
      return State.Default;
    }

    const currentSection = this.#sections.find(
                               section => section.steps.includes(currentStep),
                               ) as Models.Section.Section;

    if (!currentSection) {
      if (this.#currentError) {
        return State.Error;
      }
    }

    if (section === currentSection) {
      return State.Success;
    }

    const index = this.#sections.indexOf(currentSection);
    const ownIndex = this.#sections.indexOf(section);
    return index >= ownIndex ? State.Success : State.Outstanding;
  }

  #renderStep(
      section: Models.Section.Section,
      step: Models.Schema.Step,
      isLastSection: boolean,
      ): LitHtml.TemplateResult {
    const stepIndex = this.#steps.indexOf(step);
    // clang-format off
    return LitHtml.html`
      <${StepView.litTagName}
      @click=${this.#onStepClick}
      @mouseover=${this.#onStepHover}
      @copystep=${this.#onCopyStepEvent}
      .data=${
        {
          step,
          state: this.#getStepState(step),
          error: this.#currentStep === step ? this.#currentError : undefined,
          isFirstSection: false,
          isLastSection:
            isLastSection && this.#steps[this.#steps.length - 1] === step,
          isStartOfGroup: false,
          isEndOfGroup: section.steps[section.steps.length - 1] === step,
          stepIndex,
          hasBreakpoint: this.#breakpointIndexes.has(stepIndex),
          sectionIndex: -1,
          isRecording: this.#isRecording,
          isPlaying: this.#replayState.isPlaying,
          removable: this.#steps.length > 1,
          builtInConverters: this.#builtInConverters,
          extensionConverters: this.#extensionConverters,
          isSelected: this.#selectedStep === step,
          recorderSettings: this.#recorderSettings,
        } as StepViewData
      }
      ></${StepView.litTagName}>
    `;
    // clang-format on
  }

  #onStepHover = (event: MouseEvent): void => {
    const stepView = event.target as StepView;
    const step = stepView.step || stepView.section?.causingStep;
    if (!step || this.#selectedStep) {
      return;
    }
    this.#highlightCodeForStep(step);
  };

  #onStepClick(event: Event): void {
    event.stopPropagation();
    const stepView = event.target as StepView;
    const selectedStep = stepView.step || stepView.section?.causingStep || null;
    if (this.#selectedStep === selectedStep) {
      return;
    }
    this.#selectedStep = selectedStep;
    this.#render();
    if (selectedStep) {
      this.#highlightCodeForStep(selectedStep, /* scroll=*/ true);
    }
  }

  #onWrapperClick(): void {
    if (this.#selectedStep === undefined) {
      return;
    }
    this.#selectedStep = undefined;
    this.#render();
  }

  #onReplaySettingsKeydown(event: Event): void {
    if ((event as KeyboardEvent).key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.#onToggleReplaySettings(event);
  }

  #onToggleReplaySettings(event: Event): void {
    event.stopPropagation();
    this.#replaySettingsExpanded = !this.#replaySettingsExpanded;
    this.#render();
  }

  #onNetworkConditionsChange(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    const preset = networkConditionPresets.find(
        preset => preset.i18nTitleKey === event.itemValue,
    );
    this.dispatchEvent(
        new NetworkConditionsChanged(
            preset?.i18nTitleKey === SDK.NetworkManager.NoThrottlingConditions.i18nTitleKey ? undefined : preset,
            ),
    );
  }

  #onTimeoutInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.checkValidity()) {
      target.reportValidity();
      return;
    }
    this.dispatchEvent(new TimeoutChanged(Number(target.value)));
  }

  #onTitleBlur = (event: Event): void => {
    const target = event.target as HTMLElement;
    const title = target.innerText.trim();
    if (!title) {
      this.#isTitleInvalid = true;
      this.#render();
      return;
    }
    this.dispatchEvent(new RecordingTitleChangedEvent(title));
  };

  #onTitleInputKeyDown = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'Escape':
      case 'Enter':
        (event.target as HTMLElement).blur();
        event.stopPropagation();
        break;
    }
  };

  #onEditTitleButtonClick = (): void => {
    const input = this.#shadow.getElementById('title-input') as HTMLElement;
    input.focus();
    const range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  #onSelectMenuLabelClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.matches('.wrapping-label')) {
      target.querySelector('devtools-select-menu')?.click();
    }
  };

  async #copyCurrentSelection(step?: Models.Schema.Step|null): Promise<void> {
    let converter =
        [
          ...this.#builtInConverters,
          ...this.#extensionConverters,
        ]
            .find(
                converter => converter.getId() === this.#recorderSettings?.preferredCopyFormat,
            );
    if (!converter) {
      converter = this.#builtInConverters[0];
    }
    if (!converter) {
      throw new Error('No default converter found');
    }

    let text = '';
    if (step) {
      text = await converter.stringifyStep(step);
    } else if (this.#userFlow) {
      [text] = await converter.stringify(this.#userFlow);
    }

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text);
    const metric = step ? converterIdToStepMetric(converter.getId()) : converterIdToFlowMetric(converter.getId());
    Host.userMetrics.recordingCopiedToClipboard(metric);
  }

  #onCopyStepEvent(event: CopyStepEvent): void {
    event.stopPropagation();
    void this.#copyCurrentSelection(event.step);
  }

  async #onCopy(event: ClipboardEvent): Promise<void> {
    if (event.target !== document.body) {
      return;
    }

    event.preventDefault();
    await this.#copyCurrentSelection(this.#selectedStep);
    Host.userMetrics.keyboardShortcutFired(
        'chrome_recorder.copy-recording-or-step',
    );
  }

  #renderSettings(): LitHtml.TemplateResult {
    if (!this.#settings) {
      return LitHtml.html``;
    }
    const environmentFragments = [];
    if (this.#settings.viewportSettings) {
      // clang-format off
      environmentFragments.push(
        LitHtml.html`<div>${
          this.#settings.viewportSettings.isMobile
            ? i18nString(UIStrings.mobile)
            : i18nString(UIStrings.desktop)
        }</div>`,
      );
      environmentFragments.push(LitHtml.html`<div class="separator"></div>`);
      environmentFragments.push(
        LitHtml.html`<div>${this.#settings.viewportSettings.width}×${
          this.#settings.viewportSettings.height
        } px</div>`,
      );
      // clang-format on
    }
    const replaySettingsFragments = [];
    if (!this.#replaySettingsExpanded) {
      if (this.#settings.networkConditionsSettings) {
        if (this.#settings.networkConditionsSettings.title) {
          // clang-format off
          replaySettingsFragments.push(
            LitHtml.html`<div>${
              this.#settings.networkConditionsSettings.title
            }</div>`,
          );
          // clang-format on
        } else {
          // clang-format off
          replaySettingsFragments.push(LitHtml.html`<div>
            ${i18nString(UIStrings.download, {
              value: Platform.NumberUtilities.bytesToString(
                this.#settings.networkConditionsSettings.download,
              ),
            })},
            ${i18nString(UIStrings.upload, {
              value: Platform.NumberUtilities.bytesToString(
                this.#settings.networkConditionsSettings.upload,
              ),
            })},
            ${i18nString(UIStrings.latency, {
              value: this.#settings.networkConditionsSettings.latency,
            })}
          </div>`);
          // clang-format on
        }
      } else {
        // clang-format off
        replaySettingsFragments.push(
          LitHtml.html`<div>${
            SDK.NetworkManager.NoThrottlingConditions.title instanceof Function
              ? SDK.NetworkManager.NoThrottlingConditions.title()
              : SDK.NetworkManager.NoThrottlingConditions.title
          }</div>`,
        );
        // clang-format on
      }
      // clang-format off
      replaySettingsFragments.push(LitHtml.html`<div class="separator"></div>`);
      replaySettingsFragments.push(
        LitHtml.html`<div>${i18nString(UIStrings.timeout, {
          value: this.#settings.timeout || Models.RecordingPlayer.defaultTimeout,
        })}</div>`,
      );
      // clang-format on
    } else {
      // clang-format off
      const selectedOption =
        this.#settings.networkConditionsSettings?.i18nTitleKey ||
        SDK.NetworkManager.NoThrottlingConditions.i18nTitleKey;
      const selectedOptionTitle = networkConditionPresets.find(
        preset => preset.i18nTitleKey === selectedOption,
      );
      let menuButtonTitle = '';
      if (selectedOptionTitle) {
        menuButtonTitle =
          selectedOptionTitle.title instanceof Function
            ? selectedOptionTitle.title()
            : selectedOptionTitle.title;
      }

      replaySettingsFragments.push(LitHtml.html`<div class="editable-setting">
        <label class="wrapping-label" @click=${this.#onSelectMenuLabelClick}>
          ${i18nString(UIStrings.network)}
          <${Menus.SelectMenu.SelectMenu.litTagName}
            @selectmenuselected=${this.#onNetworkConditionsChange}
            .disabled=${!this.#steps.find(step => step.type === 'navigate')}
            .showDivider=${true}
            .showArrow=${true}
            .sideButton=${false}
            .showSelectedItem=${true}
            .showConnector=${false}
            .position=${Dialogs.Dialog.DialogVerticalPosition.BOTTOM}
            .buttonTitle=${menuButtonTitle}
          >
            ${networkConditionPresets.map(condition => {
              return LitHtml.html`<${Menus.Menu.MenuItem.litTagName}
                .value=${condition.i18nTitleKey}
                .selected=${selectedOption === condition.i18nTitleKey}
              >
                ${
                  condition.title instanceof Function
                    ? condition.title()
                    : condition.title
                }
              </${Menus.Menu.MenuItem.litTagName}>`;
            })}
          </${Menus.SelectMenu.SelectMenu.litTagName}>
        </label>
      </div>`);
      replaySettingsFragments.push(LitHtml.html`<div class="editable-setting">
        <label class="wrapping-label" title=${i18nString(
          UIStrings.timeoutExplanation,
        )}>
          ${i18nString(UIStrings.timeoutLabel)}
          <input
            @input=${this.#onTimeoutInput}
            required
            min=${Models.SchemaUtils.minTimeout}
            max=${Models.SchemaUtils.maxTimeout}
            value=${
              this.#settings.timeout || Models.RecordingPlayer.defaultTimeout
            }
            class="devtools-text-input"
            type="number">
        </label>
      </div>`);
      // clang-format on
    }
    const isEditable = !this.#isRecording && !this.#replayState.isPlaying;
    const replaySettingsButtonClassMap = {
      'settings-title': true,
      expanded: this.#replaySettingsExpanded,
    };
    const replaySettingsClassMap = {
      expanded: this.#replaySettingsExpanded,
      settings: true,
    };
    // clang-format off
    return LitHtml.html`
      <div class="settings-row">
        <div class="settings-container">
          <div
            class=${LitHtml.Directives.classMap(replaySettingsButtonClassMap)}
            @keydown=${isEditable && this.#onReplaySettingsKeydown}
            @click=${isEditable && this.#onToggleReplaySettings}
            tabindex="0"
            role="button"
            aria-label=${i18nString(UIStrings.editReplaySettings)}>
            <span>${i18nString(UIStrings.replaySettings)}</span>
            ${
              isEditable
                ? LitHtml.html`<${IconButton.Icon.Icon.litTagName}
                    class="chevron"
                    .data=${
                      {
                        iconName: 'triangle-down',
                        color: 'var(--sys-color-on-surface)',
                      } as IconButton.Icon.IconData
                    }>
                  </${IconButton.Icon.Icon.litTagName}>`
                : ''
            }
          </div>
          <div class=${LitHtml.Directives.classMap(replaySettingsClassMap)}>
            ${
              replaySettingsFragments.length
                ? replaySettingsFragments
                : LitHtml.html`<div>${i18nString(UIStrings.default)}</div>`
            }
          </div>
        </div>
        <div class="settings-container">
          <div class="settings-title">${i18nString(UIStrings.environment)}</div>
          <div class="settings">
            ${
              environmentFragments.length
                ? environmentFragments
                : LitHtml.html`<div>${i18nString(UIStrings.default)}</div>`
            }
          </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  #getCurrentConverter(): Converters.Converter.Converter|undefined {
    const currentConverter = [
      ...(this.#builtInConverters || []),
      ...(this.#extensionConverters || []),
    ].find(converter => converter.getId() === this.#converterId);
    if (!currentConverter) {
      return this.#builtInConverters[0];
    }
    return currentConverter;
  }

  #renderTimelineArea(): LitHtml.LitTemplate {
    if (this.#extensionDescriptor) {
      // clang-format off
      return LitHtml.html`
        <${ExtensionView.litTagName} .descriptor=${this.#extensionDescriptor}>
        </${ExtensionView.litTagName}>
      `;
      // clang-format on
    }
    const currentConverter = this.#getCurrentConverter();
    const converterFormatName = currentConverter?.getFormatName();
    // clang-format off
    return !this.#showCodeView
      ? this.#renderSections()
      : LitHtml.html`
        <${SplitView.SplitView.SplitView.litTagName}>
          <div slot="main">
            ${this.#renderSections()}
          </div>
          <div slot="sidebar">
            <div class="section-toolbar">
              <${Menus.SelectMenu.SelectMenu.litTagName}
                @selectmenuselected=${this.#onCodeFormatChange}
                .showDivider=${true}
                .showArrow=${true}
                .sideButton=${false}
                .showSelectedItem=${true}
                .showConnector=${false}
                .position=${Dialogs.Dialog.DialogVerticalPosition.BOTTOM}
                .buttonTitle=${converterFormatName}
              >
                ${this.#builtInConverters.map(converter => {
                  return LitHtml.html`<${Menus.Menu.MenuItem.litTagName}
                    .value=${converter.getId()}
                    .selected=${this.#converterId === converter.getId()}
                  >
                    ${converter.getFormatName()}
                  </${Menus.Menu.MenuItem.litTagName}>`;
                })}
                ${this.#extensionConverters.map(converter => {
                  return LitHtml.html`<${Menus.Menu.MenuItem.litTagName}
                    .value=${converter.getId()}
                    .selected=${this.#converterId === converter.getId()}
                  >
                    ${converter.getFormatName()}
                  </${Menus.Menu.MenuItem.litTagName}>`;
                })}
              </${Menus.SelectMenu.SelectMenu.litTagName}>
              <${Buttons.Button.Button.litTagName}
                title=${Models.Tooltip.getTooltipForActions(
                  i18nString(UIStrings.hideCode),
                  Actions.RecorderActions.ToggleCodeView,
                )}
                .data=${
                  {
                    variant: Buttons.Button.Variant.ROUND,
                    size: Buttons.Button.Size.SMALL,
                    iconName: 'cross',
                  } as Buttons.Button.ButtonData
                }
                @click=${this.showCodeToggle}
              ></${Buttons.Button.Button.litTagName}>
            </div>
            <div class="text-editor">
              <${TextEditor.TextEditor.TextEditor.litTagName} .state=${
          this.#editorState
        }></${TextEditor.TextEditor.TextEditor.litTagName}>
            </div>
          </div>
        </${SplitView.SplitView.SplitView.litTagName}>
      `;
    // clang-format on
  }

  #renderScreenshot(
      section: Models.Section.Section,
      ): LitHtml.TemplateResult|null {
    if (!section.screenshot) {
      return null;
    }

    // clang-format off
    return LitHtml.html`
      <img class="screenshot" src=${section.screenshot} alt=${i18nString(
      UIStrings.screenshotForSection,
    )} />
    `;
    // clang-format on
  }

  #renderReplayOrAbortButton(): LitHtml.TemplateResult {
    if (this.#replayState.isPlaying) {
      return LitHtml.html`
        <${Buttons.Button.Button.litTagName} @click=${this.#handleAbortReplay} .iconName=${'pause'} .variant=${
          Buttons.Button.Variant.SECONDARY}>
          ${i18nString(UIStrings.cancelReplay)}
        </${Buttons.Button.Button.litTagName}>`;
    }

    // clang-format off
    return LitHtml.html`<${ReplayButton.litTagName}
        .data=${
          {
            settings: this.#recorderSettings,
            replayExtensions: this.#replayExtensions,
          } as ReplayButtonData
        }
        .disabled=${this.#replayState.isPlaying}
        @startreplay=${this.#handleTogglePlaying}
        >
      </${ReplayButton.litTagName}>`;
    // clang-format on
  }

  #handleMeasurePerformanceClickEvent(event: Event): void {
    event.stopPropagation();

    this.dispatchEvent(
        new PlayRecordingEvent({
          targetPanel: TargetPanel.PerformancePanel,
          speed: PlayRecordingSpeed.Normal,
        }),
    );
  }

  showCodeToggle = (): void => {
    this.#showCodeView = !this.#showCodeView;
    Host.userMetrics.recordingCodeToggled(
        this.#showCodeView ? Host.UserMetrics.RecordingCodeToggled.CodeShown :
                             Host.UserMetrics.RecordingCodeToggled.CodeHidden,
    );
    void this.#convertToCode();
  };

  #convertToCode = async(): Promise<void> => {
    if (!this.#userFlow) {
      return;
    }
    const converter = this.#getCurrentConverter();
    if (!converter) {
      return;
    }
    const [code, sourceMap] = await converter.stringify(this.#userFlow);
    this.#code = code;
    this.#sourceMap = sourceMap;
    this.#sourceMap?.shift();
    const mediaType = converter.getMediaType();
    const languageSupport = mediaType ? await CodeHighlighter.CodeHighlighter.languageFromMIME(mediaType) : null;
    this.#editorState = CodeMirror.EditorState.create({
      doc: this.#code,
      extensions: [
        TextEditor.Config.baseConfiguration(this.#code),
        CodeMirror.EditorState.readOnly.of(true),
        CodeMirror.EditorView.lineWrapping,
        languageSupport ? languageSupport : [],
      ],
    });
    this.#render();
    // Used by tests.
    this.dispatchEvent(new Event('code-generated'));
  };

  #highlightCodeForStep = (step: Models.Schema.Step, scroll = false): void => {
    if (!this.#sourceMap) {
      return;
    }

    const stepIndex = this.#steps.indexOf(step);
    if (stepIndex === -1) {
      return;
    }

    const editor = this.#shadow.querySelector('devtools-text-editor') as | TextEditor.TextEditor.TextEditor | undefined;
    if (!editor) {
      return;
    }

    const cm = editor.editor;
    if (!cm) {
      return;
    }

    const line = this.#sourceMap[stepIndex * 2];
    const length = this.#sourceMap[stepIndex * 2 + 1];

    let selection = editor.createSelection(
        {lineNumber: line + length, columnNumber: 0},
        {lineNumber: line, columnNumber: 0},
    );
    const lastLine = editor.state.doc.lineAt(selection.main.anchor);
    selection = editor.createSelection(
        {lineNumber: line + length - 1, columnNumber: lastLine.length + 1},
        {lineNumber: line, columnNumber: 0},
    );

    cm.dispatch({
      selection,
      effects: scroll ?
          [
            CodeMirror.EditorView.scrollIntoView(selection.main, {
              y: 'nearest',
            }),
          ] :
          undefined,
    });
  };

  #onCodeFormatChange = (event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void => {
    this.#converterId = event.itemValue as string;
    if (this.#recorderSettings) {
      this.#recorderSettings.preferredCopyFormat = event.itemValue as string;
    }

    void this.#convertToCode();
  };

  #renderSections(): LitHtml.LitTemplate {
    // clang-format off
    return LitHtml.html`
      <div class="sections">
      ${
        !this.#showCodeView
          ? LitHtml.html`<div class="section-toolbar">
        <${Buttons.Button.Button.litTagName}
          @click=${this.showCodeToggle}
          class="show-code"
          .data=${
            {
              variant: Buttons.Button.Variant.SECONDARY,
              title: Models.Tooltip.getTooltipForActions(
                i18nString(UIStrings.showCode),
                Actions.RecorderActions.ToggleCodeView,
              ),
            } as Buttons.Button.ButtonData
          }
        >
          ${i18nString(UIStrings.showCode)}
        </${Buttons.Button.Button.litTagName}>
      </div>`
          : ''
      }
      ${this.#sections.map(
        (section, i) => LitHtml.html`
            <div class="section">
              <div class="screenshot-wrapper">
                ${this.#renderScreenshot(section)}
              </div>
              <div class="content">
                <div class="steps">
                  <${StepView.litTagName}
                    @click=${this.#onStepClick}
                    @mouseover=${this.#onStepHover}
                    .data=${
                      {
                        section,
                        state: this.#getSectionState(section),
                        isStartOfGroup: true,
                        isEndOfGroup: section.steps.length === 0,
                        isFirstSection: i === 0,
                        isLastSection:
                          i === this.#sections.length - 1 &&
                          section.steps.length === 0,
                        isSelected:
                          this.#selectedStep === (section.causingStep || null),
                        sectionIndex: i,
                        isRecording: this.#isRecording,
                        isPlaying: this.#replayState.isPlaying,
                        error:
                          this.#getSectionState(section) === State.Error
                            ? this.#currentError
                            : undefined,
                        hasBreakpoint: false,
                        removable: this.#steps.length > 1 && section.causingStep,
                      } as StepViewData
                    }
                  >
                  </${StepView.litTagName}>
                  ${section.steps.map(step =>
                    this.#renderStep(
                      section,
                      step,
                      i === this.#sections.length - 1,
                    ),
                  )}
                  ${!this.#recordingTogglingInProgress && this.#isRecording && i === this.#sections.length - 1 ? LitHtml.html`<devtools-button
                    class="step add-assertion-button"
                    .data=${
                      {
                        variant: Buttons.Button.Variant.SECONDARY,
                        title: i18nString(UIStrings.addAssertion),
                      } as Buttons.Button.ButtonData
                    }
                    @click=${this.#dispatchAddAssertionEvent}
                  >${i18nString(UIStrings.addAssertion)}</devtools-button>` : undefined}
                  ${
                    this.#isRecording && i === this.#sections.length - 1
                      ? LitHtml.html`<div class="step recording">${i18nString(
                          UIStrings.recording,
                        )}</div>`
                      : null
                  }
                </div>
              </div>
            </div>
      `,
      )}
      </div>
    `;
    // clang-format on
  }

  #renderHeader(): LitHtml.LitTemplate|string {
    if (!this.#userFlow) {
      return '';
    }
    const {title} = this.#userFlow;
    const isTitleEditable = !this.#replayState.isPlaying && !this.#isRecording;
    // clang-format off
    return LitHtml.html`
      <div class="header">
        <div class="header-title-wrapper">
          <div class="header-title">
            <span @blur=${this.#onTitleBlur}
                  @keydown=${this.#onTitleInputKeyDown}
                  id="title-input"
                  .contentEditable=${isTitleEditable ? 'true' : 'false'}
                  class=${LitHtml.Directives.classMap({
                    'has-error': this.#isTitleInvalid,
                    'disabled': !isTitleEditable,
                  })}
                  .innerText=${LitHtml.Directives.live(title)}></span>
            <div class="title-button-bar">
              <${Buttons.Button.Button.litTagName}
                @click=${this.#onEditTitleButtonClick}
                .data=${
                  {
                    disabled: !isTitleEditable,
                    variant: Buttons.Button.Variant.TOOLBAR,
                    iconName: 'edit',
                    title: i18nString(UIStrings.editTitle),
                  } as Buttons.Button.ButtonData
                }
              ></${Buttons.Button.Button.litTagName}>
            </div>
          </div>
          ${
            this.#isTitleInvalid
              ? LitHtml.html`<div class="title-input-error-text">
            ${
              i18nString(UIStrings.requiredTitleError)
            }
          </div>`
              : ''
          }
        </div>
        ${
          !this.#isRecording && this.#replayAllowed
            ? LitHtml.html`<div class="actions">
                <${Buttons.Button.Button.litTagName}
                  @click=${this.#handleMeasurePerformanceClickEvent}
                  .data=${
                    {
                      disabled: this.#replayState.isPlaying,
                      variant: Buttons.Button.Variant.SECONDARY,
                      iconName: 'performance',
                      title: i18nString(UIStrings.performancePanel),
                    } as Buttons.Button.ButtonData
                  }
                >
                  ${i18nString(UIStrings.performancePanel)}
                </${Buttons.Button.Button.litTagName}>
                ${this.#renderReplayOrAbortButton()}
              </div>`
            : ''
        }
      </div>`;
    // clang-format on
  }

  #renderFooter(): LitHtml.LitTemplate|string {
    if (!this.#isRecording) {
      return '';
    }
    const translation = this.#recordingTogglingInProgress ? i18nString(UIStrings.recordingIsBeingStopped) :
                                                            i18nString(UIStrings.endRecording);
    // clang-format off
    return LitHtml.html`
      <div class="footer">
        <div class="controls">
          <devtools-control-button
            @click=${this.#dispatchRecordingFinished}
            .disabled=${this.#recordingTogglingInProgress}
            .shape=${'square'}
            .label=${translation}
            title=${Models.Tooltip.getTooltipForActions(
              translation,
              Actions.RecorderActions.StartRecording,
            )}
          >
          </devtools-control-button>
        </div>
      </div>
    `;
    // clang-format on
  }

  #render(): void {
    const classNames = {
      wrapper: true,
      'is-recording': this.#isRecording,
      'is-playing': this.#replayState.isPlaying,
      'was-successful': this.#lastReplayResult === Models.RecordingPlayer.ReplayResult.Success,
      'was-failure': this.#lastReplayResult === Models.RecordingPlayer.ReplayResult.Failure,
    };

    // clang-format off
    LitHtml.render(
      LitHtml.html`
      <div @click=${this.#onWrapperClick} class=${LitHtml.Directives.classMap(
        classNames,
      )}>
        <div class="main">
          ${this.#renderHeader()}
          ${
            this.#extensionDescriptor
              ? LitHtml.html`
            <${ExtensionView.litTagName} .descriptor=${
                  this.#extensionDescriptor
                }>
            </${ExtensionView.litTagName}>
          `
              : LitHtml.html`
            ${this.#renderSettings()}
            ${this.#renderTimelineArea()}
          `
          }
          ${this.#renderFooter()}
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
    'devtools-recording-view',
    RecordingView,
);
