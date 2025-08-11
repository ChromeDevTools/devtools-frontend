// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';
import './ExtensionView.js';
import './ControlButton.js';
import './ReplaySection.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as PublicExtensions from '../../../models/extensions/extensions.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import type * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as CodeHighlighter from '../../../ui/components/code_highlighter/code_highlighter.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as Input from '../../../ui/components/input/input.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as TextEditor from '../../../ui/components/text_editor/text_editor.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import type * as Converters from '../converters/converters.js';
import type * as Extensions from '../extensions/extensions.js';
import * as Models from '../models/models.js';
import {PlayRecordingSpeed} from '../models/RecordingPlayer.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import recordingViewStyles from './recordingView.css.js';
import type {ReplaySectionData, StartReplayEvent} from './ReplaySection.js';
import {
  type CopyStepEvent,
  State,
  type StepView,
  type StepViewData,
} from './StepView.js';
const {html} = Lit;

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
} as const;
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

export const enum TargetPanel {
  PERFORMANCE_PANEL = 'timeline',
  DEFAULT = 'chrome-recorder',
}

export interface PlayRecordingEvent {
  targetPanel: TargetPanel;
  speed: PlayRecordingSpeed;
  extension?: Extensions.ExtensionManager.Extension;
}

const networkConditionPresets = [
  SDK.NetworkManager.NoThrottlingConditions,
  SDK.NetworkManager.OfflineConditions,
  SDK.NetworkManager.Slow3GConditions,
  SDK.NetworkManager.Slow4GConditions,
  SDK.NetworkManager.Fast4GConditions,
];

function converterIdToFlowMetric(
    converterId: string,
    ): Host.UserMetrics.RecordingCopiedToClipboard {
  switch (converterId) {
    case Models.ConverterIds.ConverterIds.PUPPETEER:
    case Models.ConverterIds.ConverterIds.PUPPETEER_FIREFOX:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_RECORDING_WITH_PUPPETEER;
    case Models.ConverterIds.ConverterIds.JSON:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_RECORDING_WITH_JSON;
    case Models.ConverterIds.ConverterIds.REPLAY:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_RECORDING_WITH_REPLAY;
    default:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_RECORDING_WITH_EXTENSION;
  }
}

function converterIdToStepMetric(
    converterId: string,
    ): Host.UserMetrics.RecordingCopiedToClipboard {
  switch (converterId) {
    case Models.ConverterIds.ConverterIds.PUPPETEER:
    case Models.ConverterIds.ConverterIds.PUPPETEER_FIREFOX:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_STEP_WITH_PUPPETEER;
    case Models.ConverterIds.ConverterIds.JSON:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_STEP_WITH_JSON;
    case Models.ConverterIds.ConverterIds.REPLAY:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_STEP_WITH_REPLAY;
    default:
      return Host.UserMetrics.RecordingCopiedToClipboard.COPIED_STEP_WITH_EXTENSION;
  }
}

function renderSettings({
  settings,
  replaySettingsExpanded,
  onSelectMenuLabelClick,
  onNetworkConditionsChange,
  onTimeoutInput,
  isRecording,
  replayState,
  onReplaySettingsKeydown,
  onToggleReplaySettings
}: ViewInput): Lit.TemplateResult {
  if (!settings) {
    return html``;
  }
  const environmentFragments = [];
  if (settings.viewportSettings) {
    // clang-format off
    environmentFragments.push(
      html`<div>${
        settings.viewportSettings.isMobile
          ? i18nString(UIStrings.mobile)
          : i18nString(UIStrings.desktop)
      }</div>`,
    );
    environmentFragments.push(html`<div class="separator"></div>`);
    environmentFragments.push(
      html`<div>${settings.viewportSettings.width}×${
        settings.viewportSettings.height
      } px</div>`,
    );
    // clang-format on
  }
  const replaySettingsFragments = [];
  if (!replaySettingsExpanded) {
    if (settings.networkConditionsSettings) {
      if (settings.networkConditionsSettings.title) {
        // clang-format off
        replaySettingsFragments.push(
          html`<div>${
            settings.networkConditionsSettings.title
          }</div>`,
        );
        // clang-format on
      } else {
        // clang-format off
        replaySettingsFragments.push(html`<div>
          ${i18nString(UIStrings.download, {
            value: i18n.ByteUtilities.bytesToString(
              settings.networkConditionsSettings.download,
            ),
          })},
          ${i18nString(UIStrings.upload, {
            value: i18n.ByteUtilities.bytesToString(
              settings.networkConditionsSettings.upload,
            ),
          })},
          ${i18nString(UIStrings.latency, {
            value: settings.networkConditionsSettings.latency,
          })}
        </div>`);
        // clang-format on
      }
    } else {
      // clang-format off
      replaySettingsFragments.push(
        html`<div>${
          SDK.NetworkManager.NoThrottlingConditions.title instanceof Function
            ? SDK.NetworkManager.NoThrottlingConditions.title()
            : SDK.NetworkManager.NoThrottlingConditions.title
        }</div>`,
      );
      // clang-format on
    }
    // clang-format off
    replaySettingsFragments.push(html`<div class="separator"></div>`);
    replaySettingsFragments.push(
      html`<div>${i18nString(UIStrings.timeout, {
        value: settings.timeout || Models.RecordingPlayer.defaultTimeout,
      })}</div>`,
    );
    // clang-format on
  } else {
    // clang-format off
    const selectedOption =
      settings.networkConditionsSettings?.i18nTitleKey ||
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

    replaySettingsFragments.push(html`<div class="editable-setting">
      <label class="wrapping-label" @click=${onSelectMenuLabelClick}>
        ${i18nString(UIStrings.network)}
        <select
            title=${menuButtonTitle}
            jslog=${VisualLogging.dropDown('network-conditions').track({change: true})}
            @change=${onNetworkConditionsChange}>
      ${networkConditionPresets.map(condition => html`
        <option jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(condition.i18nTitleKey || ''))}
                value=${condition.i18nTitleKey || ''} ?selected=${selectedOption === condition.i18nTitleKey}>
                ${
                  condition.title instanceof Function
                    ? condition.title()
                    : condition.title
                }
        </option>`)}
    </select>
      </label>
    </div>`);
    replaySettingsFragments.push(html`<div class="editable-setting">
      <label class="wrapping-label" title=${i18nString(
        UIStrings.timeoutExplanation,
      )}>
        ${i18nString(UIStrings.timeoutLabel)}
        <input
          @input=${onTimeoutInput}
          required
          min=${Models.SchemaUtils.minTimeout}
          max=${Models.SchemaUtils.maxTimeout}
          value=${
            settings.timeout || Models.RecordingPlayer.defaultTimeout
          }
          jslog=${VisualLogging.textField('timeout').track({change: true})}
          class="devtools-text-input"
          type="number">
      </label>
    </div>`);
    // clang-format on
  }
  const isEditable = !isRecording && !replayState.isPlaying;
  const replaySettingsButtonClassMap = {
    'settings-title': true,
    expanded: replaySettingsExpanded,
  };
  const replaySettingsClassMap = {
    expanded: replaySettingsExpanded,
    settings: true,
  };
  // clang-format off
  return html`
    <div class="settings-row">
      <div class="settings-container">
        <div
          class=${Lit.Directives.classMap(replaySettingsButtonClassMap)}
          @keydown=${isEditable && onReplaySettingsKeydown}
          @click=${isEditable && onToggleReplaySettings}
          tabindex="0"
          role="button"
          jslog=${VisualLogging.action('replay-settings').track({click: true})}
          aria-label=${i18nString(UIStrings.editReplaySettings)}>
          <span>${i18nString(UIStrings.replaySettings)}</span>
          ${
            isEditable
              ? html`<devtools-icon
                  class="chevron"
                  name="triangle-down">
                </devtools-icon>`
              : ''
          }
        </div>
        <div class=${Lit.Directives.classMap(replaySettingsClassMap)}>
          ${
            replaySettingsFragments.length
              ? replaySettingsFragments
              : html`<div>${i18nString(UIStrings.default)}</div>`
          }
        </div>
      </div>
      <div class="settings-container">
        <div class="settings-title">${i18nString(UIStrings.environment)}</div>
        <div class="settings">
          ${
            environmentFragments.length
              ? environmentFragments
              : html`<div>${i18nString(UIStrings.default)}</div>`
          }
        </div>
      </div>
    </div>
  `;
  // clang-format on
}

function renderTimelineArea(input: ViewInput, output: ViewOutput): Lit.LitTemplate {
  if (input.extensionDescriptor) {
    // clang-format off
      return html`
        <devtools-recorder-extension-view .descriptor=${input.extensionDescriptor}>
        </devtools-recorder-extension-view>
      `;
    // clang-format on
  }
  // clang-format off
    /* eslint-disable rulesdir/no-deprecated-component-usages */
    return html`
        <devtools-split-view
          direction="auto"
          sidebar-position="second"
          sidebar-initial-size="300"
          sidebar-visibility=${input.showCodeView ? '' : 'hidden'}
        >
          <div slot="main">
            ${renderSections(input)}
          </div>
          <div slot="sidebar" jslog=${VisualLogging.pane('source-code').track({resize: true})}>
            ${input.showCodeView ? html`
            <div class="section-toolbar" jslog=${VisualLogging.toolbar()}>
              <devtools-select-menu
                @selectmenuselected=${input.onCodeFormatChange}
                .showDivider=${true}
                .showArrow=${true}
                .sideButton=${false}
                .showSelectedItem=${true}
                .position=${Dialogs.Dialog.DialogVerticalPosition.BOTTOM}
                .buttonTitle=${input.converterName || ''}
                .jslogContext=${'code-format'}
              >
                ${input.builtInConverters.map(converter => {
                  return html`<devtools-menu-item
                    .value=${converter.getId()}
                    .selected=${input.converterId === converter.getId()}
                    jslog=${VisualLogging.action().track({click: true}).context(`converter-${Platform.StringUtilities.toKebabCase(converter.getId())}`)}
                  >
                    ${converter.getFormatName()}
                  </devtools-menu-item>`;
                })}
                ${input.extensionConverters.map(converter => {
                  return html`<devtools-menu-item
                    .value=${converter.getId()}
                    .selected=${input.converterId === converter.getId()}
                    jslog=${VisualLogging.action().track({click: true}).context('converter-extension')}
                  >
                    ${converter.getFormatName()}
                  </devtools-menu-item>`;
                })}
              </devtools-select-menu>
              <devtools-button
                title=${Models.Tooltip.getTooltipForActions(
                  i18nString(UIStrings.hideCode),
                  Actions.RecorderActions.TOGGLE_CODE_VIEW,
                )}
                .data=${
                  {
                    variant: Buttons.Button.Variant.ICON,
                    size: Buttons.Button.Size.SMALL,
                    iconName: 'cross',
                  } as Buttons.Button.ButtonData
                }
                @click=${input.showCodeToggle}
                jslog=${VisualLogging.close().track({click: true})}
              ></devtools-button>
            </div>
            ${renderTextEditor(input, output)}`
            : Lit.nothing}
          </div>
        </devtools-split-view>
      `;
    /* eslint-enable rulesdir/no-deprecated-component-usages */
  // clang-format on
}

function renderTextEditor(input: ViewInput, output: ViewOutput): Lit.TemplateResult {
  if (!input.editorState) {
    throw new Error('Unexpected: trying to render the text editor without editorState');
  }

  // clang-format off
  return html`
    <div class="text-editor" jslog=${VisualLogging.textField().track({change: true})}>
      <devtools-text-editor .state=${input.editorState} ${Lit.Directives.ref((editor: Element | undefined) => {
        if (!editor || !(editor instanceof TextEditor.TextEditor.TextEditor)) {
          return;
        }
        output.highlightLinesInEditor = (line: number, length: number, scroll = false) => {
          const cm = editor.editor;
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
      })}></devtools-text-editor>
    </div>
  `;
  // clang-format on
}

function renderScreenshot(
    section: Models.Section.Section,
    ): Lit.TemplateResult|null {
  if (!section.screenshot) {
    return null;
  }

  // clang-format off
    return html`
      <img class="screenshot" src=${section.screenshot} alt=${i18nString(
      UIStrings.screenshotForSection,
    )} />
    `;
  // clang-format on
}

function renderReplayOrAbortButton(input: ViewInput): Lit.LitTemplate {
  if (input.replayState.isPlaying) {
    return html`
        <devtools-button .jslogContext=${'abort-replay'} @click=${input.onAbortReplay} .iconName=${'pause'} .variant=${
        Buttons.Button.Variant.OUTLINED}>
          ${i18nString(UIStrings.cancelReplay)}
        </devtools-button>`;
  }

  if (!input.recorderSettings) {
    return Lit.nothing;
  }

  // clang-format off
    return html`<devtools-replay-section
        .data=${
          {
            settings: input.recorderSettings,
            replayExtensions: input.replayExtensions,
          } as ReplaySectionData
        }
        .disabled=${input.replayState.isPlaying}
        @startreplay=${input.onTogglePlaying}
        >
      </devtools-replay-section>`;
  // clang-format on
}

function renderSections(input: ViewInput): Lit.LitTemplate {
  // clang-format off
    return html`
      <div class="sections">
      ${
        !input.showCodeView
          ? html`<div class="section-toolbar">
        <devtools-button
          @click=${input.showCodeToggle}
          class="show-code"
          .data=${
            {
              variant: Buttons.Button.Variant.OUTLINED,
              title: Models.Tooltip.getTooltipForActions(
                i18nString(UIStrings.showCode),
                Actions.RecorderActions.TOGGLE_CODE_VIEW,
              ),
            } as Buttons.Button.ButtonData
          }
          jslog=${VisualLogging.toggleSubpane(Actions.RecorderActions.TOGGLE_CODE_VIEW).track({click: true})}
        >
          ${i18nString(UIStrings.showCode)}
        </devtools-button>
      </div>`
          : ''
      }
      ${input.sections.map(
        (section, i) => html`
            <div class="section">
              <div class="screenshot-wrapper">
                ${renderScreenshot(section)}
              </div>
              <div class="content">
                <div class="steps">
                  <devtools-step-view
                    @click=${input.onStepClick}
                    @mouseover=${input.onStepHover}
                    .data=${
                      {
                        section,
                        state: input.getSectionState(section),
                        isStartOfGroup: true,
                        isEndOfGroup: section.steps.length === 0,
                        isFirstSection: i === 0,
                        isLastSection:
                          i === input.sections.length - 1 &&
                          section.steps.length === 0,
                        isSelected:
                          input.selectedStep === (section.causingStep || null),
                        sectionIndex: i,
                        isRecording: input.isRecording,
                        isPlaying: input.replayState.isPlaying,
                        error:
                          input.getSectionState(section) === State.ERROR
                            ? input.currentError
                            : undefined,
                        hasBreakpoint: false,
                        removable: input.recording.steps.length > 1 && section.causingStep,
                      } as StepViewData
                    }
                  >
                  </devtools-step-view>
                  ${section.steps.map(step => {
                    const stepIndex = input.recording.steps.indexOf(step);
                    return html`
                      <devtools-step-view
                      @click=${input.onStepClick}
                      @mouseover=${input.onStepHover}
                      @copystep=${input.onCopyStep}
                      .data=${
                        {
                          step,
                          state: input.getStepState(step),
                          error: input.currentStep === step ? input.currentError : undefined,
                          isFirstSection: false,
                          isLastSection:
                            i === input.sections.length - 1 && input.recording.steps[input.recording.steps.length - 1] === step,
                          isStartOfGroup: false,
                          isEndOfGroup: section.steps[section.steps.length - 1] === step,
                          stepIndex,
                          hasBreakpoint: input.breakpointIndexes.has(stepIndex),
                          sectionIndex: -1,
                          isRecording: input.isRecording,
                          isPlaying: input.replayState.isPlaying,
                          removable: input.recording.steps.length > 1,
                          builtInConverters: input.builtInConverters,
                          extensionConverters: input.extensionConverters,
                          isSelected: input.selectedStep === step,
                          recorderSettings: input.recorderSettings,
                        } as StepViewData
                      }
                      jslog=${VisualLogging.section('step').track({click: true})}
                      ></devtools-step-view>
                    `;
                  })}
                  ${!input.recordingTogglingInProgress && input.isRecording && i === input.sections.length - 1 ? html`<devtools-button
                    class="step add-assertion-button"
                    .data=${
                      {
                        variant: Buttons.Button.Variant.OUTLINED,
                        title: i18nString(UIStrings.addAssertion),
                        jslogContext: 'add-assertion',
                      } as Buttons.Button.ButtonData
                    }
                    @click=${input.onAddAssertion}
                  >${i18nString(UIStrings.addAssertion)}</devtools-button>` : undefined}
                  ${
                    input.isRecording && i === input.sections.length - 1
                      ? html`<div class="step recording">${i18nString(
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

function renderHeader(input: ViewInput): Lit.LitTemplate {
  if (!input.recording) {
    return Lit.nothing;
  }
  const {title} = input.recording;
  const isTitleEditable = !input.replayState.isPlaying && !input.isRecording;
  // clang-format off
  return html`
    <div class="header">
      <div class="header-title-wrapper">
        <div class="header-title">
          <input @blur=${input.onTitleBlur}
                @keydown=${input.onTitleInputKeyDown}
                id="title-input"
                jslog=${VisualLogging.value('title').track({change: true})}
                class=${Lit.Directives.classMap({
                  'has-error': input.isTitleInvalid,
                  disabled: !isTitleEditable,
                })}
                .value=${Lit.Directives.live(title)}
                .disabled=${!isTitleEditable}
                >
          <div class="title-button-bar">
            <devtools-button
              @click=${input.onEditTitleButtonClick}
              .data=${
                {
                  disabled: !isTitleEditable,
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'edit',
                  title: i18nString(UIStrings.editTitle),
                  jslogContext: 'edit-title',
                } as Buttons.Button.ButtonData
              }
            ></devtools-button>
          </div>
        </div>
        ${
          input.isTitleInvalid
            ? html`<div class="title-input-error-text">
          ${
            i18nString(UIStrings.requiredTitleError)
          }
        </div>`
            : Lit.nothing
        }
      </div>
      ${
        !input.isRecording && input.replayAllowed
          ? html`<div class="actions">
              <devtools-button
                @click=${input.onMeasurePerformanceClick}
                .data=${
                  {
                    disabled: input.replayState.isPlaying,
                    variant: Buttons.Button.Variant.OUTLINED,
                    iconName: 'performance',
                    title: i18nString(UIStrings.performancePanel),
                    jslogContext: 'measure-performance',
                  } as Buttons.Button.ButtonData
                }
              >
                ${i18nString(UIStrings.performancePanel)}
              </devtools-button>
              <div class="separator"></div>
              ${renderReplayOrAbortButton(input)}
            </div>`
          : Lit.nothing
      }
    </div>`;
  // clang-format on
}

interface ViewInput {
  breakpointIndexes: Set<number>;
  builtInConverters: readonly Converters.Converter.Converter[];
  converterId: string;
  converterName: string|null;
  currentError: Error|null;
  currentStep: Models.Schema.Step|null;
  editorState: CodeMirror.EditorState|null;
  extensionConverters: readonly Converters.Converter.Converter[];
  extensionDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;
  isRecording: boolean;
  isTitleInvalid: boolean;
  lastReplayResult: Models.RecordingPlayer.ReplayResult|null;
  recorderSettings: Models.RecorderSettings.RecorderSettings|null;
  recording: Models.Schema.UserFlow;
  recordingTogglingInProgress: boolean;
  replayAllowed: boolean;
  replayExtensions: Extensions.ExtensionManager.Extension[];
  replaySettingsExpanded: boolean;
  replayState: ReplayState;
  sections: Models.Section.Section[];
  selectedStep: Models.Schema.Step|null;
  settings: Models.RecordingSettings.RecordingSettings|null;
  showCodeView: boolean;

  onAddAssertion: () => void;
  onRecordingFinished: () => void;
  getSectionState: (section: Models.Section.Section) => State;
  getStepState: (step: Models.Schema.Step) => State;
  onAbortReplay: () => void;
  onMeasurePerformanceClick: (event: Event) => void;
  onTogglePlaying: (event: StartReplayEvent) => void;
  onCodeFormatChange: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
  onCopyStep: (event: CopyStepEvent) => void;
  onEditTitleButtonClick: (event: Event) => void;
  onNetworkConditionsChange: (event: Event) => void;
  onReplaySettingsKeydown: (event: Event) => void;
  onSelectMenuLabelClick: (event: Event) => void;
  onStepClick: (event: Event) => void;
  onStepHover: (event: MouseEvent) => void;
  onTimeoutInput: (event: Event) => void;
  onTitleBlur: (event: Event) => void;
  onTitleInputKeyDown: (event: KeyboardEvent) => void;
  onToggleReplaySettings: (event: Event) => void;
  onWrapperClick: () => void;
  showCodeToggle: () => void;
}

export interface ViewOutput {
  highlightLinesInEditor?: (line: number, length: number, scroll?: boolean) => void;
}

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const classNames = {
    wrapper: true,
    'is-recording': input.isRecording,
    'is-playing': input.replayState.isPlaying,
    'was-successful': input.lastReplayResult === Models.RecordingPlayer.ReplayResult.SUCCESS,
    'was-failure': input.lastReplayResult === Models.RecordingPlayer.ReplayResult.FAILURE,
  };

  const footerButtonTitle = input.recordingTogglingInProgress ? i18nString(UIStrings.recordingIsBeingStopped) :
                                                                i18nString(UIStrings.endRecording);
  // clang-format off
  Lit.render(
    html`
    <style>${UI.inspectorCommonStyles}</style>
    <style>${recordingViewStyles}</style>
    <style>${Input.textInputStyles}</style>
    <div @click=${input.onWrapperClick} class=${Lit.Directives.classMap(
      classNames,
    )}>
      <div class="recording-view main">
        ${renderHeader(input)}
        ${
          input.extensionDescriptor
            ? html`
            <devtools-recorder-extension-view .descriptor=${
              input.extensionDescriptor
            }></devtools-recorder-extension-view>` : html`
          ${renderSettings(input)}
          ${renderTimelineArea(input, output)}
        `}
        ${input.isRecording ? html`<div class="footer">
          <div class="controls">
            <devtools-control-button
              jslog=${VisualLogging.toggle('toggle-recording').track({click: true})}
              @click=${input.onRecordingFinished}
              .disabled=${input.recordingTogglingInProgress}
              .shape=${'square'}
              .label=${footerButtonTitle}
              title=${Models.Tooltip.getTooltipForActions(
                footerButtonTitle,
                Actions.RecorderActions.START_RECORDING,
              )}
            >
            </devtools-control-button>
          </div>
        </div>`: Lit.nothing}
      </div>
    </div>
  `,
    target,
  );
  // clang-format on
};

export class RecordingView extends UI.Widget.Widget {
  replayState: ReplayState = {isPlaying: false, isPausedOnBreakpoint: false};
  isRecording = false;
  recordingTogglingInProgress = false;
  recording: Models.Schema.UserFlow = {
    title: '',
    steps: [],
  };
  currentStep?: Models.Schema.Step;
  currentError?: Error;
  sections: Models.Section.Section[] = [];
  settings?: Models.RecordingSettings.RecordingSettings;
  lastReplayResult?: Models.RecordingPlayer.ReplayResult;
  replayAllowed = false;
  breakpointIndexes = new Set<number>();
  extensionConverters: readonly Converters.Converter.Converter[] = [];
  replayExtensions?: Extensions.ExtensionManager.Extension[];
  extensionDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;

  addAssertion?: () => void;
  abortReplay?: () => void;
  recordingFinished?: () => void;
  playRecording?: (event: PlayRecordingEvent) => void;
  networkConditionsChanged?: (data?: SDK.NetworkManager.Conditions) => void;
  timeoutChanged?: (timeout?: number) => void;
  titleChanged?: (title: string) => void;

  #recorderSettings?: Models.RecorderSettings.RecorderSettings;
  get recorderSettings(): Models.RecorderSettings.RecorderSettings|undefined {
    return this.#recorderSettings;
  }
  set recorderSettings(settings: Models.RecorderSettings.RecorderSettings|undefined) {
    this.#recorderSettings = settings;
    this.#converterId = this.recorderSettings?.preferredCopyFormat ?? this.#builtInConverters[0]?.getId();
    void this.#convertToCode();
  }

  #builtInConverters: readonly Converters.Converter.Converter[] = [];
  get builtInConverters(): readonly Converters.Converter.Converter[] {
    return this.#builtInConverters;
  }
  set builtInConverters(converters: readonly Converters.Converter.Converter[]) {
    this.#builtInConverters = converters;
    this.#converterId = this.recorderSettings?.preferredCopyFormat ?? this.#builtInConverters[0]?.getId();
    void this.#convertToCode();
  }

  #isTitleInvalid = false;
  #selectedStep?: Models.Schema.Step|null;
  #replaySettingsExpanded = false;
  #showCodeView = false;
  #code = '';
  #converterId = '';
  #sourceMap: PuppeteerReplay.SourceMap|undefined;
  #editorState?: CodeMirror.EditorState;

  #onCopyBound = this.#onCopy.bind(this);
  #view: typeof DEFAULT_VIEW;
  #viewOutput: ViewOutput = {};

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view || DEFAULT_VIEW;
  }

  override performUpdate(): void {
    const converter =
        [
          ...(this.builtInConverters || []),
          ...(this.extensionConverters || []),
        ].find(converter => converter.getId() === this.#converterId) ??
        this.builtInConverters[0];

    this.#view(
        {
          breakpointIndexes: this.breakpointIndexes,
          builtInConverters: this.builtInConverters,
          converterId: this.#converterId,
          converterName: converter?.getFormatName(),
          currentError: this.currentError ?? null,
          currentStep: this.currentStep ?? null,
          editorState: this.#editorState ?? null,
          extensionConverters: this.extensionConverters,
          extensionDescriptor: this.extensionDescriptor,
          isRecording: this.isRecording,
          isTitleInvalid: this.#isTitleInvalid,
          lastReplayResult: this.lastReplayResult ?? null,
          recorderSettings: this.#recorderSettings ?? null,
          recording: this.recording,
          recordingTogglingInProgress: this.recordingTogglingInProgress,
          replayAllowed: this.replayAllowed,
          replayExtensions: this.replayExtensions ?? [],
          replaySettingsExpanded: this.#replaySettingsExpanded,
          replayState: this.replayState,
          sections: this.sections,
          selectedStep: this.#selectedStep ?? null,
          settings: this.settings ?? null,
          showCodeView: this.#showCodeView,

          onAddAssertion: () => {
            this.addAssertion?.();
          },
          onRecordingFinished: () => {
            this.recordingFinished?.();
          },
          getSectionState: this.#getSectionState.bind(this),
          getStepState: this.#getStepState.bind(this),
          onAbortReplay: () => {
            this.abortReplay?.();
          },
          onMeasurePerformanceClick: this.#handleMeasurePerformanceClickEvent.bind(this),
          onTogglePlaying: (event: StartReplayEvent) => {
            this.playRecording?.({
              targetPanel: TargetPanel.DEFAULT,
              speed: event.speed,
              extension: event.extension,
            });
          },
          onCodeFormatChange: this.#onCodeFormatChange.bind(this),
          onCopyStep: this.#onCopyStepEvent.bind(this),
          onEditTitleButtonClick: this.#onEditTitleButtonClick.bind(this),
          onNetworkConditionsChange: this.#onNetworkConditionsChange.bind(this),
          onReplaySettingsKeydown: this.#onReplaySettingsKeydown.bind(this),
          onSelectMenuLabelClick: this.#onSelectMenuLabelClick.bind(this),
          onStepClick: this.#onStepClick.bind(this),
          onStepHover: this.#onStepHover.bind(this),
          onTimeoutInput: this.#onTimeoutInput.bind(this),
          onTitleBlur: this.#onTitleBlur.bind(this),
          onTitleInputKeyDown: this.#onTitleInputKeyDown.bind(this),
          onToggleReplaySettings: this.#onToggleReplaySettings.bind(this),
          onWrapperClick: this.#onWrapperClick.bind(this),
          showCodeToggle: this.showCodeToggle.bind(this),
        },
        this.#viewOutput, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    document.addEventListener('copy', this.#onCopyBound);
    this.performUpdate();
  }

  override willHide(): void {
    super.willHide();
    document.removeEventListener('copy', this.#onCopyBound);
  }

  scrollToBottom(): void {
    const wrapper = this.contentElement?.querySelector('.sections');
    if (!wrapper) {
      return;
    }
    wrapper.scrollTop = wrapper.scrollHeight;
  }

  #getStepState(step: Models.Schema.Step): State {
    if (!this.currentStep) {
      return State.DEFAULT;
    }
    if (step === this.currentStep) {
      if (this.currentError) {
        return State.ERROR;
      }
      if (!this.replayState?.isPlaying) {
        return State.SUCCESS;
      }

      if (this.replayState?.isPausedOnBreakpoint) {
        return State.STOPPED;
      }

      return State.CURRENT;
    }
    const currentIndex = this.recording.steps.indexOf(this.currentStep);
    if (currentIndex === -1) {
      return State.DEFAULT;
    }

    const index = this.recording.steps.indexOf(step);
    return index < currentIndex ? State.SUCCESS : State.OUTSTANDING;
  }

  #getSectionState(section: Models.Section.Section): State {
    const currentStep = this.currentStep;
    if (!currentStep) {
      return State.DEFAULT;
    }

    const currentSection = this.sections.find(
                               section => section.steps.includes(currentStep),
                               ) as Models.Section.Section;

    if (!currentSection) {
      if (this.currentError) {
        return State.ERROR;
      }
    }

    if (section === currentSection) {
      return State.SUCCESS;
    }

    const index = this.sections.indexOf(currentSection);
    const ownIndex = this.sections.indexOf(section);
    return index >= ownIndex ? State.SUCCESS : State.OUTSTANDING;
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
    this.performUpdate();
    if (selectedStep) {
      this.#highlightCodeForStep(selectedStep, /* scroll=*/ true);
    }
  }

  #onWrapperClick(): void {
    if (this.#selectedStep === undefined) {
      return;
    }
    this.#selectedStep = undefined;
    this.performUpdate();
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
    this.performUpdate();
  }

  #onNetworkConditionsChange(event: Event): void {
    const throttlingMenu = event.target;
    if (throttlingMenu instanceof HTMLSelectElement) {
      const preset = networkConditionPresets.find(
          preset => preset.i18nTitleKey === throttlingMenu.value,
      );
      this.networkConditionsChanged?.(
          preset?.i18nTitleKey === SDK.NetworkManager.NoThrottlingConditions.i18nTitleKey ? undefined : preset,
      );
    }
  }

  #onTimeoutInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.checkValidity()) {
      target.reportValidity();
      return;
    }
    this.timeoutChanged?.(Number(target.value));
  }

  #onTitleBlur = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const title = target.value.trim();
    if (!title) {
      this.#isTitleInvalid = true;
      this.performUpdate();
      return;
    }
    this.titleChanged?.(title);
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
    const input = this.contentElement.querySelector<HTMLInputElement>('#title-input');
    if (!input) {
      throw new Error('Missing #title-input');
    }
    input.focus();
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
          ...this.builtInConverters,
          ...this.extensionConverters,
        ]
            .find(
                converter => converter.getId() === this.recorderSettings?.preferredCopyFormat,
            );
    if (!converter) {
      converter = this.builtInConverters[0];
    }
    if (!converter) {
      throw new Error('No default converter found');
    }

    let text = '';
    if (step) {
      text = await converter.stringifyStep(step);
    } else if (this.recording) {
      [text] = await converter.stringify(this.recording);
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
    Host.userMetrics.keyboardShortcutFired(Actions.RecorderActions.COPY_RECORDING_OR_STEP);
  }

  #handleMeasurePerformanceClickEvent(event: Event): void {
    event.stopPropagation();

    this.playRecording?.({
      targetPanel: TargetPanel.PERFORMANCE_PANEL,
      speed: PlayRecordingSpeed.NORMAL,
    });
  }

  showCodeToggle = (): void => {
    this.#showCodeView = !this.#showCodeView;
    Host.userMetrics.recordingCodeToggled(
        this.#showCodeView ? Host.UserMetrics.RecordingCodeToggled.CODE_SHOWN :
                             Host.UserMetrics.RecordingCodeToggled.CODE_HIDDEN,
    );
    void this.#convertToCode();
  };

  #convertToCode = async(): Promise<void> => {
    if (!this.recording) {
      return;
    }
    const converter =
        [
          ...(this.builtInConverters || []),
          ...(this.extensionConverters || []),
        ].find(converter => converter.getId() === this.#converterId) ??
        this.builtInConverters[0];

    if (!converter) {
      return;
    }

    const [code, sourceMap] = await converter.stringify(this.recording);
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
    this.performUpdate();
    // Used by tests.
    this.contentElement.dispatchEvent(new Event('code-generated'));
  };

  #highlightCodeForStep = (step: Models.Schema.Step, scroll = false): void => {
    if (!this.#sourceMap) {
      return;
    }

    const stepIndex = this.recording.steps.indexOf(step);
    if (stepIndex === -1) {
      return;
    }

    const line = this.#sourceMap[stepIndex * 2];
    const length = this.#sourceMap[stepIndex * 2 + 1];

    this.#viewOutput.highlightLinesInEditor?.(line, length, scroll);
  };

  #onCodeFormatChange = (event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void => {
    this.#converterId = event.itemValue as string;
    if (this.recorderSettings) {
      this.recorderSettings.preferredCopyFormat = event.itemValue as string;
    }

    void this.#convertToCode();
  };
}
