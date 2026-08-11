// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as PublicExtensions from '../../models/extensions/extensions.js';
import type * as Trace from '../../models/trace/trace.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../ui/components/dialogs/dialogs.js';
import type * as Menus from '../../ui/components/menus/menus.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Converters from './converters/converters.js';
import {CreateRecordingView} from './CreateRecordingView.js';
import * as Extensions from './extensions/extensions.js';
import * as Models from './models/models.js';
import * as Actions from './recorder-actions/recorder-actions.js';
import * as Events from './RecorderEvents.js';
import recorderPanelStyles from './recorderPanel.css.js';
import {RecordingListView} from './RecordingListView.js';
import {
  type PlayRecordingEvent as ViewPlayRecordingEvent,
  RecordingView,
  type ReplayState,
  TargetPanel,
} from './RecordingView.js';
import {
  AddStepPosition,
} from './StepView.js';

const {ref, repeat} = Directives;

let recorderPanelInstance: RecorderPanel;

const UIStrings = {
  /**
   * @description The title of the button that leads to a page for creating a new recording.
   */
  createRecording: 'Create recording',
  /**
   * @description The title of the button that allows importing a recording.
   */
  importRecording: 'Import recording',
  /**
   * @description The announcement text for screen readers when a recording is imported.
   */
  recordingImported: 'Recording imported',
  /**
   * @description The title of the button that deletes the recording.
   */
  deleteRecording: 'Delete recording',
  /**
   * @description The announcement text for screen readers when a recording is deleted.
   */
  recordingDeleted: 'Recording deleted',
  /**
   * @description The title of the select option if the user has no saved recordings.
   */
  noRecordings: 'No recordings',
  /**
   * @description The title of the select option for one or more recording number followed by this text - 1 recording(s) or 4 recording(s).
   */
  numberOfRecordings: 'recording(s)',
  /**
   * @description The title of the button that continues the replay.
   */
  continueReplay: 'Continue',
  /**
   * @description The title of the button that executes only one step in the replay.
   */
  stepOverReplay: 'Execute one step',
  /**
   * @description The title of the button that opens a menu with various options of exporting a recording to file.
   */
  exportRecording: 'Export recording',
  /**
   * @description The title of shortcut for starting and stopping recording.
   */
  startStopRecording: 'Start/stop recording',
  /**
   * @description The title of shortcut for replaying recording.
   */
  replayRecording: 'Replay recording',
  /**
   * @description The title of shortcut for copying a recording or selected step.
   */
  copyShortcut: 'Copy recording or selected step',
  /**
   * @description The title of shortcut for toggling code view.
   */
  toggleCode: 'Toggle code view',
  /**
   * @description The title of the menu group in the export menu of the Recorder
   * panel that is followed by the list of built-in export formats.
   */
  export: 'Export',
  /**
   * @description The announcement text for screen readers when a recording is exported successfully.
   */
  recordingExported: 'Recording exported',
  /**
   * @description The title of the menu group in the export menu of the Recorder
   * panel that is followed by the list of export formats available via browser
   * extensions.
   */
  exportViaExtensions: 'Export via extensions',
  /**
   * @description The title of the menu option that leads to a page that lists
   * all browser extensions available for the Recorder panel.
   */
  getExtensions: 'Get extensions…',
  /**
   * @description The button label that leads to the feedback form for the Recorder panel.
   */
  sendFeedback: 'Send feedback',
  /**
   * @description The header of the start page in the Recorder panel.
   */
  header: 'Nothing recorded yet',
  /**
   * @description Text to explain the usage of the Recorder panel.
   */
  recordingDescription: 'Use recordings to create automated end-to-end tests or performance traces.',
  /**
   * @description Link text to forward to a documentation page on the Recorder panel.
   */
  learnMore: 'Learn more',
  /**
   * @description Headline of warning shown when users import a recording into the Recorder panel.
   */
  doYouTrustThisCode: 'Do you trust this recording?',
  /**
   * @description Warning shown to users when importing code into the Recorder panel. IMPORTANT: keep double quotes around PH1 and do not use single quotes.
   * @example {allow importing} PH1
   */
  doNotImport:
      'Don’t import recordings you don’t understand or haven’t reviewed yourself into DevTools. This could allow attackers to steal your identity or take control of your computer. Type "{PH1}" below to allow importing.',
  /**
   * @description Text a user needs to type in order to confirm that they
   * are aware of the danger of importing code into the Recorder panel.
   */
  allowImporting: 'allow importing',
  /**
   * @description Input box placeholder which instructs the user to type 'allow importing' into the input box. IMPORTANT: keep double quotes around PH1 and do not use single quotes.
   * @example {allow importing} PH1
   */
  typeAllowImporting: 'Type "{PH1}"',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/recorder/RecorderPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {widget} = UI.Widget;

const GET_EXTENSIONS_MENU_ITEM = 'get-extensions-link';
const GET_EXTENSIONS_URL = 'https://goo.gle/recorder-extension-list' as Platform.DevToolsPath.UrlString;
const RECORDER_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/recorder';
const FEEDBACK_URL = 'https://goo.gle/recorder-feedback' as Platform.DevToolsPath.UrlString;

export interface StoredRecording {
  storageName: string;
  flow: Models.Schema.UserFlow;
}

interface SetCurrentRecordingOptions {
  /**
   * Whether to keep breakpoints in the recording.
   */
  keepBreakpoints: boolean;
  /**
   * Whether to upstream the recording to a recording session if it exists.
   */
  updateSession: boolean;
}

export const enum Pages {
  START_PAGE = 'StartPage',
  ALL_RECORDINGS_PAGE = 'AllRecordingsPage',
  CREATE_RECORDING_PAGE = 'CreateRecordingPage',
  RECORDING_PAGE = 'RecordingPage',
}

/** Provide some defaults to prevent OOM issues like crbug.com/491027421 */
function verifyFlowSize(flow: Models.Schema.UserFlow): void {
  if (flow.steps.length > 4096) {
    throw new Error('Recording with steps over 4096 is not allowed');
  }

  if (flow.title.length > 300) {
    throw new Error('Recording with title over 300 characters is not allowed');
  }
}

export interface ViewInput {
  recordings: StoredRecording[];
  currentRecording?: StoredRecording;
  currentPage: Pages;
  isRecording: boolean;
  isToggling: boolean;
  importError?: Error;
  recordingError?: Error;
  sections: Models.Section.Section[];
  settings?: Models.RecordingSettings.RecordingSettings;
  recorderSettings: Models.RecorderSettings.RecorderSettings;
  lastReplayResult?: Models.RecordingPlayer.ReplayResult;
  replayAllowed: boolean;
  breakpointIndexes: Set<number>;
  builtInConverters: readonly Converters.Converter.Converter[];
  extensionConverters: Converters.Converter.Converter[];
  replayExtensions: Extensions.ExtensionManager.Extension[];
  extensionDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;
  exportMenuExpanded: boolean;
  replayState: ReplayState;
  shortcutsInfo: Dialogs.ShortcutDialog.Shortcut[];
  currentStep?: Models.Schema.Step;

  onCreateNewRecording: (event?: Event) => void;
  onImportRecording: (event: Event) => void;
  onExportRecording: (event: Event) => void;
  onDeleteRecording: (event: Event|string) => void;
  onRecordingSelected: (event: Event|string) => void;
  onPlayRecordingByName: (storageName: string) => void;
  onPlayRecording: (event: ViewPlayRecordingEvent) => void;
  onAbortReplay: () => void;
  onNetworkConditionsChanged: (data?: SDK.NetworkManager.Conditions) => void;
  onTimeoutChanged: (timeout?: number) => void;
  handleRecordingTitleChanged: (title: string) => void;
  handleRecordingChanged: (currentStep: Models.Schema.Step, newStep: Models.Schema.Step) => void;
  handleStepAdded: (stepOrSection: Models.Schema.Step|Models.Section.Section, position: AddStepPosition) => void;
  handleStepRemoved: (step: Models.Schema.Step) => void;
  onAddBreakpoint: (index: number) => void;
  onRemoveBreakpoint: (index: number) => void;
  onExtensionViewClosed: () => void;
  onExportMenuClosed: () => void;
  onExportOptionSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
  onRecordingFinished: () => void;
  handleAddAssertionEvent: () => void;
  onSetRecording: (event: Event) => void;
  onContinueReplay: () => void;
  onStepOverReplay: () => void;

  getExportMenuButton: () => Buttons.Button.Button;

  onRecordingStarted:
      (data: {name: string, selectorTypesToRecord: Models.Schema.SelectorType[], selectorAttribute?: string}) => void;
  onRecordingCancelled: () => void;
}

export interface ViewOutput {
  exportMenuButton: Buttons.Button.Button;
  recordingView: RecordingView;
  createRecordingView: CreateRecordingView;
}

export type View = (input: ViewInput, output: ViewOutput, target: DocumentFragment) => void;

export const DEFAULT_VIEW: View = (input, output, target): void => {
  function renderCurrentPage(): LitTemplate {
    switch (input.currentPage) {
      case Pages.START_PAGE:
        return renderStartPage();
      case Pages.ALL_RECORDINGS_PAGE:
        return renderAllRecordingsPage();
      case Pages.RECORDING_PAGE:
        return renderRecordingPage();
      case Pages.CREATE_RECORDING_PAGE:
        return renderCreateRecordingPage();
    }
  }

  function renderAllRecordingsPage(): LitTemplate {
    // clang-format off
    return html`
      <devtools-widget
        ${widget(RecordingListView, {
          recordings: input.recordings.map(recording => ({
            storageName: recording.storageName,
            name: recording.flow.title,
          })),
          replayAllowed: input.replayAllowed,
          onCreateRecording: input.onCreateNewRecording,
          onDeleteRecording: input.onDeleteRecording,
          onOpenRecording: input.onRecordingSelected,
          onPlayRecording: input.onPlayRecordingByName,
        })}
      >
      </devtools-widget>
    `;
    // clang-format on
  }

  function renderStartPage(): LitTemplate {
    // clang-format off
    return html`
      <div class="empty-state" jslog=${VisualLogging.section().context('start-view')}>
        <div class="empty-state-header">${i18nString(UIStrings.header)}</div>
        <div class="empty-state-description">
          <span>${i18nString(UIStrings.recordingDescription)}</span>
          <devtools-link
            class="devtools-link"
            href=${RECORDER_EXPLANATION_URL}
            jslogcontext="learn-more"
          >${i18nString(UIStrings.learnMore)}</devtools-link>
        </div>
        <devtools-button .variant=${Buttons.Button.Variant.TONAL} jslogContext=${Actions.RecorderActions.CREATE_RECORDING} @click=${input.onCreateNewRecording}>${i18nString(UIStrings.createRecording)}</devtools-button>
      </div>
    `;
    // clang-format on
  }

  function renderRecordingPage(): LitTemplate {
    // clang-format off
    return html`
      <devtools-widget
          class="recording-view"
          ${widget(RecordingView, {
            recording: input.currentRecording?.flow ?? {title: '', steps: []},
            replayState: input.replayState,
            isRecording: input.isRecording,
            recordingTogglingInProgress: input.isToggling,
            currentStep: input.currentStep,
            currentError: input.recordingError,
            sections: input.sections ?? [],
            settings: input.settings,
            recorderSettings: input.recorderSettings,
            lastReplayResult: input.lastReplayResult,
            replayAllowed: input.replayAllowed,
            breakpointIndexes: input.breakpointIndexes,
            builtInConverters: input.builtInConverters,
            extensionConverters: input.extensionConverters,
            replayExtensions: input.replayExtensions,
            extensionDescriptor: input.extensionDescriptor,
            onRecordingFinished: input.onRecordingFinished,
            onAddAssertion: input.handleAddAssertionEvent,
            onAbortReplay: input.onAbortReplay,
            onPlayRecording: input.onPlayRecording,
            onNetworkConditionsChanged: input.onNetworkConditionsChanged,
            onTimeoutChanged: input.onTimeoutChanged,
            onTitleChanged: input.handleRecordingTitleChanged,
            onStepChanged: input.handleRecordingChanged,
            onAddStep: input.handleStepAdded,
            onRemoveStep: input.handleStepRemoved,
            onAddBreakpoint: input.onAddBreakpoint,
            onRemoveBreakpoint: input.onRemoveBreakpoint,
            onAttributeRequested: (send: (attribute?: string) => void) => {
              send(input.currentRecording?.flow.selectorAttribute);
            },
          })}
          @recorderextensionviewclosed=${input.onExtensionViewClosed}
          ${UI.Widget.widgetRef(RecordingView, widget => {output.recordingView = widget; })}
        ></devtools-widget>
    `;
    // clang-format on
  }

  function renderCreateRecordingPage(): LitTemplate {
    // clang-format off
    return html`
      <devtools-widget
        class="recording-view"
        ${widget(CreateRecordingView, {
          recorderSettings: input.recorderSettings,
          onRecordingStarted: input.onRecordingStarted,
          onRecordingCancelled: input.onRecordingCancelled,
        })}
        ${UI.Widget.widgetRef(
          CreateRecordingView,
          widget => {
            output.createRecordingView = widget;
          },
        )}
      ></devtools-widget>
    `;
    // clang-format on
  }

  const selectValue: string = input.currentRecording ? input.currentRecording.storageName : input.currentPage;
  // clang-format off
  const values = [
    input.recordings.length === 0
      ? {
          value: Pages.START_PAGE,
          name: i18nString(UIStrings.noRecordings),
          selected: selectValue === Pages.START_PAGE,
        }
      : {
          value: Pages.ALL_RECORDINGS_PAGE,
          name: `${input.recordings.length} ${i18nString(UIStrings.numberOfRecordings)}`,
          selected: selectValue === Pages.ALL_RECORDINGS_PAGE,
        },
    ...input.recordings.map(recording => ({
      value: recording.storageName,
      name: recording.flow.title,
      selected: selectValue === recording.storageName,
    })),
  ];

  render(html`
        <style>${UI.inspectorCommonStyles}</style>
        <style>${recorderPanelStyles}</style>
        <div class="wrapper">
          <div class="header" jslog=${VisualLogging.toolbar()}>
            <devtools-button
              @click=${input.onCreateNewRecording}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'plus',
                  disabled:
                    input.replayState.isPlaying ||
                    input.isRecording ||
                    input.isToggling,
                  title: Models.Tooltip.getTooltipForActions(
                    i18nString(UIStrings.createRecording),
                    Actions.RecorderActions.CREATE_RECORDING,
                  ),
                  jslogContext: Actions.RecorderActions.CREATE_RECORDING,
                } as Buttons.Button.ButtonData
             }
            ></devtools-button>
            <div class="separator"></div>
            <select
              .disabled=${
                input.recordings.length === 0 ||
                input.replayState.isPlaying ||
                input.isRecording ||
                input.isToggling
              }
              @click=${(e: Event) => e.stopPropagation()}
              @change=${input.onRecordingSelected}
              jslog=${VisualLogging.dropDown('recordings').track({change: true})}
            >
              ${repeat(
                values,
                item => item.value,
                item => {
                  return html`<option .selected=${item.selected} value=${item.value}>${item.name}</option>`;
                },
              )}
            </select>
            <div class="separator"></div>
            <devtools-button
              @click=${input.onImportRecording}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'import',
                  title: i18nString(UIStrings.importRecording),
                  jslogContext: 'import-recording',
                } as Buttons.Button.ButtonData
              }
            ></devtools-button>
            <devtools-button
              id='origin'
              @click=${input.onExportRecording}
              ${ref(el => {
                if (el instanceof HTMLElement) {
                  output.exportMenuButton = el as Buttons.Button.Button;
                }
              })}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'download',
                  title: i18nString(UIStrings.exportRecording),
                  disabled: !input.currentRecording,
                } as Buttons.Button.ButtonData
              }
              jslog=${VisualLogging.dropDown('export-recording').track({click: true})}
            ></devtools-button>
            <devtools-menu
              @menucloserequest=${input.onExportMenuClosed}
              @menuitemselected=${input.onExportOptionSelected}
              .origin=${input.getExportMenuButton}
              .showDivider=${false}
              .showSelectedItem=${false}
              .open=${input.exportMenuExpanded}
            >
              <devtools-menu-group .name=${i18nString(UIStrings.export)}>
                ${repeat(
                  input.builtInConverters,
                  converter => {
                    return html`
                    <devtools-menu-item
                      .value=${converter.getId()}
                      jslog=${VisualLogging.item(`converter-${Platform.StringUtilities.toKebabCase(converter.getId())}`).track({click: true})}>
                      ${converter.getFormatName()}
                    </devtools-menu-item>
                  `;
                  },
                )}
              </devtools-menu-group>
              <devtools-menu-group .name=${i18nString(UIStrings.exportViaExtensions)}>
                ${repeat(
                  input.extensionConverters,
                  converter => {
                    return html`
                    <devtools-menu-item
                     .value=${converter.getId()}
                      jslog=${VisualLogging.item('converter-extension').track({click: true})}>
                    ${converter.getFormatName()}
                    </devtools-menu-item>
                  `;
                  },
                )}
                <devtools-menu-item .value=${GET_EXTENSIONS_MENU_ITEM}>
                  ${i18nString(UIStrings.getExtensions)}
                </devtools-menu-item>
              </devtools-menu-group>
            </devtools-menu>
            <devtools-button
              @click=${input.onDeleteRecording}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'bin',
                  disabled:
                    !input.currentRecording ||
                    input.replayState.isPlaying ||
                    input.isRecording ||
                    input.isToggling,
                  title: i18nString(UIStrings.deleteRecording),
                  jslogContext: 'delete-recording',
                } as Buttons.Button.ButtonData
              }
            ></devtools-button>
            <div class="separator"></div>
            <devtools-button
              @click=${input.onContinueReplay}
              .data=${
                {
                  variant: Buttons.Button.Variant.PRIMARY_TOOLBAR,
                  iconName: 'resume',
                  disabled: !input.replayState.isPausedOnBreakpoint,
                  title: i18nString(UIStrings.continueReplay),
                  jslogContext: 'continue-replay',
                } as Buttons.Button.ButtonData
              }
            ></devtools-button>
            <devtools-button
              @click=${input.onStepOverReplay}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'step-over',
                  disabled: !input.replayState.isPausedOnBreakpoint,
                  title: i18nString(UIStrings.stepOverReplay),
                  jslogContext: 'step-over',
                } as Buttons.Button.ButtonData
              }
            ></devtools-button>
            <div class="feedback">
              <devtools-link class="devtools-link" title=${i18nString(UIStrings.sendFeedback)} href=${
                FEEDBACK_URL
              } jslogcontext="feedback">${i18nString(UIStrings.sendFeedback)}</devtools-link>
            </div>
            <div class="separator"></div>
            <devtools-shortcut-dialog
              .data=${
                {
                  shortcuts: input.shortcutsInfo,
                } as Dialogs.ShortcutDialog.ShortcutDialogData
              } jslog=${VisualLogging.action('show-shortcuts').track({click: true})}
            ></devtools-shortcut-dialog>
          </div>
          ${
            input.importError
              ? html`<div class='error'>Import error: ${
                  input.importError.message
                }</div>`
             : ''
          }
          ${renderCurrentPage()}
        </div>
    `, target, { container: { listeners: {setrecording: input.onSetRecording}}});
  // clang-format on
};

export class RecorderPanel extends UI.Widget.VBox<DocumentFragment> {
  static panelName = 'chrome-recorder';

  static instance(
      opts: {forceNew?: boolean} = {},
      ): RecorderPanel {
    const {forceNew} = opts;
    if (!recorderPanelInstance || forceNew) {
      recorderPanelInstance = new RecorderPanel();
    }

    return recorderPanelInstance;
  }
  #currentRecordingSession?: Models.RecordingSession.RecordingSession;
  get currentRecordingSession(): Models.RecordingSession.RecordingSession|undefined {
    return this.#currentRecordingSession;
  }
  set currentRecordingSession(value: Models.RecordingSession.RecordingSession|undefined) {
    if (this.#currentRecordingSession !== value) {
      this.#currentRecordingSession = value;
      this.requestUpdate();
    }
  }

  #currentRecording: StoredRecording|undefined;
  get currentRecording(): StoredRecording|undefined {
    return this.#currentRecording;
  }
  set currentRecording(value: StoredRecording|undefined) {
    if (this.#currentRecording !== value) {
      this.#currentRecording = value;
      this.requestUpdate();
    }
  }

  #currentStep?: Models.Schema.Step;
  get currentStep(): Models.Schema.Step|undefined {
    return this.#currentStep;
  }
  set currentStep(value: Models.Schema.Step|undefined) {
    if (this.#currentStep !== value) {
      this.#currentStep = value;
      this.requestUpdate();
    }
  }

  #recordingError?: Error;
  get recordingError(): Error|undefined {
    return this.#recordingError;
  }
  set recordingError(value: Error|undefined) {
    if (this.#recordingError !== value) {
      this.#recordingError = value;
      this.requestUpdate();
    }
  }

  #storage = Models.RecordingStorage.RecordingStorage.instance();
  #screenshotStorage = Models.ScreenshotStorage.ScreenshotStorage.instance();

  #isRecording = false;
  get isRecording(): boolean {
    return this.#isRecording;
  }
  set isRecording(value: boolean) {
    if (this.#isRecording !== value) {
      this.#isRecording = value;
      this.requestUpdate();
    }
  }

  #isToggling = false;
  get isToggling(): boolean {
    return this.#isToggling;
  }
  set isToggling(value: boolean) {
    if (this.#isToggling !== value) {
      this.#isToggling = value;
      this.requestUpdate();
    }
  }

  // TODO: we keep the functionality to allow/disallow replay but right now it's not used.
  // It can be used to decide if we allow replay on a certain target for example.
  #replayAllowed = true;

  #recordingPlayer?: Models.RecordingPlayer.RecordingPlayer;
  get recordingPlayer(): Models.RecordingPlayer.RecordingPlayer|undefined {
    return this.#recordingPlayer;
  }
  set recordingPlayer(value: Models.RecordingPlayer.RecordingPlayer|undefined) {
    if (this.#recordingPlayer !== value) {
      this.#recordingPlayer = value;
      this.requestUpdate();
    }
  }

  #lastReplayResult?: Models.RecordingPlayer.ReplayResult;
  get lastReplayResult(): Models.RecordingPlayer.ReplayResult|undefined {
    return this.#lastReplayResult;
  }
  set lastReplayResult(value: Models.RecordingPlayer.ReplayResult|undefined) {
    if (this.#lastReplayResult !== value) {
      this.#lastReplayResult = value;
      this.requestUpdate();
    }
  }

  readonly #replayState: ReplayState = {isPlaying: false, isPausedOnBreakpoint: false};

  #currentPage: Pages = Pages.START_PAGE;
  get currentPage(): Pages {
    return this.#currentPage;
  }
  set currentPage(value: Pages) {
    if (this.#currentPage !== value) {
      this.#currentPage = value;
      this.requestUpdate();
    }
  }

  #previousPage?: Pages;
  get previousPage(): Pages|undefined {
    return this.#previousPage;
  }
  set previousPage(value: Pages|undefined) {
    if (this.#previousPage !== value) {
      this.#previousPage = value;
      this.requestUpdate();
    }
  }

  #fileSelector?: HTMLInputElement;

  #sections?: Models.Section.Section[];
  get sections(): Models.Section.Section[]|undefined {
    return this.#sections;
  }
  set sections(value: Models.Section.Section[]|undefined) {
    if (this.#sections !== value) {
      this.#sections = value;
      this.requestUpdate();
    }
  }

  #settings?: Models.RecordingSettings.RecordingSettings;
  get settings(): Models.RecordingSettings.RecordingSettings|undefined {
    return this.#settings;
  }
  set settings(value: Models.RecordingSettings.RecordingSettings|undefined) {
    if (this.#settings !== value) {
      this.#settings = value;
      this.requestUpdate();
    }
  }

  #importError?: Error;
  get importError(): Error|undefined {
    return this.#importError;
  }
  set importError(value: Error|undefined) {
    if (this.#importError !== value) {
      this.#importError = value;
      this.requestUpdate();
    }
  }

  #exportMenuExpanded = false;
  get exportMenuExpanded(): boolean {
    return this.#exportMenuExpanded;
  }
  set exportMenuExpanded(value: boolean) {
    if (this.#exportMenuExpanded !== value) {
      this.#exportMenuExpanded = value;
      this.requestUpdate();
    }
  }

  #exportMenuButton: Buttons.Button.Button|undefined;

  #stepBreakpointIndexes = new Set<number>();

  #builtInConverters: readonly Converters.Converter.Converter[];
  #extensionConverters: Converters.Converter.Converter[] = [];
  get extensionConverters(): Converters.Converter.Converter[] {
    return this.#extensionConverters;
  }
  set extensionConverters(value: Converters.Converter.Converter[]) {
    if (this.#extensionConverters !== value) {
      this.#extensionConverters = value;
      this.requestUpdate();
    }
  }

  #replayExtensions: Extensions.ExtensionManager.Extension[] = [];
  get replayExtensions(): Extensions.ExtensionManager.Extension[] {
    return this.#replayExtensions;
  }
  set replayExtensions(value: Extensions.ExtensionManager.Extension[]) {
    if (this.#replayExtensions !== value) {
      this.#replayExtensions = value;
      this.requestUpdate();
    }
  }

  #viewDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;
  get viewDescriptor(): PublicExtensions.RecorderPluginManager.ViewDescriptor|undefined {
    return this.#viewDescriptor;
  }
  set viewDescriptor(value: PublicExtensions.RecorderPluginManager.ViewDescriptor|undefined) {
    if (this.#viewDescriptor !== value) {
      this.#viewDescriptor = value;
      this.requestUpdate();
    }
  }
  #extensionViewShowRequestedListener?:
      (event: Common.EventTarget.EventTargetEvent<PublicExtensions.RecorderPluginManager.ViewDescriptor>) => void;

  #recorderSettings = new Models.RecorderSettings.RecorderSettings();
  #shortcutHelper = new Models.RecorderShortcutHelper.RecorderShortcutHelper();

  #disableRecorderImportWarningSetting = Common.Settings.Settings.instance().createSetting(
      'disable-recorder-import-warning', false, Common.Settings.SettingStorageType.SYNCED);
  #selfXssWarningDisabledSetting = Common.Settings.Settings.instance().createSetting(
      'disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED);

  #recordingView?: RecordingView;
  #createRecordingView?: CreateRecordingView;

  #view: typeof DEFAULT_VIEW;

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    const el = element || document.createElement('devtools-recorder-panel');
    super(el, {useShadowDom: 'pure'});
    this.#view = view || DEFAULT_VIEW;

    this.setHideOnDetach();

    this.isRecording = false;
    this.isToggling = false;
    this.exportMenuExpanded = false;

    this.currentPage = Pages.START_PAGE;
    if (this.#storage.getRecordings().length) {
      this.#setCurrentPage(Pages.ALL_RECORDINGS_PAGE);
    }

    const textEditorIndent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    this.#builtInConverters = Object.freeze([
      new Converters.JSONConverter.JSONConverter(textEditorIndent),
      new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter(textEditorIndent),
      new Converters.PuppeteerConverter.PuppeteerConverter(textEditorIndent),
      new Converters.PuppeteerFirefoxConverter.PuppeteerFirefoxConverter(textEditorIndent),
      new Converters.LighthouseConverter.LighthouseConverter(textEditorIndent),
    ]);

    const extensionManager = Extensions.ExtensionManager.ExtensionManager.instance();
    this.#updateExtensions(extensionManager.extensions());
    extensionManager.addEventListener(Extensions.ExtensionManager.Events.EXTENSIONS_UPDATED, event => {
      this.#updateExtensions(event.data);
    });
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(RecorderPanel, this);
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.focus();
    });
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(RecorderPanel, null);
  }

  override onDetach(): void {
    super.onDetach();

    if (this.currentRecordingSession) {
      void this.currentRecordingSession.stop();
    }
    if (this.#extensionViewShowRequestedListener) {
      PublicExtensions.RecorderPluginManager.RecorderPluginManager.instance().removeEventListener(
          PublicExtensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED,
          this.#extensionViewShowRequestedListener,
      );
      this.#extensionViewShowRequestedListener = undefined;
    }
  }

  #updateExtensions(extensions: Extensions.ExtensionManager.Extension[]): void {
    this.extensionConverters =
        extensions.filter(extension => extension.getCapabilities().includes('export')).map((extension, idx) => {
          return new Converters.ExtensionConverter.ExtensionConverter(idx, extension);
        });
    this.replayExtensions = extensions.filter(extension => extension.getCapabilities().includes('replay'));
  }

  setIsRecordingStateForTesting(isRecording: boolean): void {
    this.isRecording = isRecording;
  }

  setRecordingStateForTesting(state: ReplayState): void {
    this.#replayState.isPlaying = state.isPlaying;
    this.#replayState.isPausedOnBreakpoint = state.isPausedOnBreakpoint;
  }

  setCurrentPageForTesting(page: Pages): void {
    this.#setCurrentPage(page);
  }

  getCurrentPageForTesting(): Pages {
    return this.currentPage;
  }

  getCurrentRecordingForTesting(): StoredRecording|undefined {
    return this.currentRecording;
  }

  getStepBreakpointIndexesForTesting(): number[] {
    return [...this.#stepBreakpointIndexes.values()];
  }

  /**
   * We should clear errors on every new action in the controller.
   * TODO: think how to make handle this centrally so that in no case
   * the error remains shown for longer than needed. Maybe a timer?
   */
  #clearError(): void {
    this.importError = undefined;
  }

  async #importFile(file: File): Promise<void> {
    const outputStream = new Common.StringOutputStream.StringOutputStream();
    const reader = new Bindings.FileUtils.ChunkedFileReader(file,
                                                            /* chunkSize */ 10000000);
    const success = await reader.read(outputStream);
    if (!success) {
      throw reader.error() ?? new Error('Unknown');
    }

    let flow: Models.Schema.UserFlow|undefined;
    try {
      flow = Models.SchemaUtils.parse(JSON.parse(outputStream.data()));
      verifyFlowSize(flow);

    } catch (error) {
      this.importError = error;
      return;
    }
    this.#setCurrentRecording(await this.#storage.upsertRecording(flow));
    this.#setCurrentPage(Pages.RECORDING_PAGE);
    this.#clearError();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.recordingImported));
  }

  setCurrentRecordingForTesting(recording: StoredRecording|undefined): void {
    this.#setCurrentRecording(recording);
  }

  getSectionsForTesting(): Models.Section.Section[]|undefined {
    return this.sections;
  }

  #setCurrentRecording(recording: StoredRecording|undefined, opts: Partial<SetCurrentRecordingOptions> = {}): void {
    const {keepBreakpoints = false, updateSession = false} = opts;
    this.recordingPlayer?.abort();
    this.currentStep = undefined;
    this.recordingError = undefined;
    this.lastReplayResult = undefined;
    this.recordingPlayer = undefined;
    this.#replayState.isPlaying = false;
    this.#replayState.isPausedOnBreakpoint = false;
    this.#stepBreakpointIndexes = keepBreakpoints ? this.#stepBreakpointIndexes : new Set();

    if (recording) {
      this.currentRecording = recording;
      this.sections = Models.Section.buildSections(recording.flow.steps);
      this.settings = this.#buildSettings(recording.flow);
      if (updateSession && this.currentRecordingSession) {
        this.currentRecordingSession.overwriteUserFlow(recording.flow);
      }
    } else {
      this.currentRecording = undefined;
      this.sections = undefined;
      this.settings = undefined;
    }

    this.#updateScreenshotsForSections();
  }

  #setCurrentPage(page: Pages): void {
    if (page === this.currentPage) {
      return;
    }

    this.previousPage = this.currentPage;
    this.currentPage = page;
  }

  #buildSettings(flow: Models.Schema.UserFlow): Models.RecordingSettings.RecordingSettings {
    const steps = flow.steps;
    const navigateStepIdx = steps.findIndex(step => step.type === 'navigate');
    const settings: Models.RecordingSettings.RecordingSettings = {timeout: flow.timeout};
    for (let i = navigateStepIdx - 1; i >= 0; i--) {
      const step = steps[i];
      if (!settings.viewportSettings && step.type === 'setViewport') {
        settings.viewportSettings = step;
      }
      if (!settings.networkConditionsSettings && step.type === 'emulateNetworkConditions') {
        settings.networkConditionsSettings = {...step};
        for (const preset of [SDK.NetworkManager.OfflineConditions, SDK.NetworkManager.Slow3GConditions,
                              SDK.NetworkManager.Slow4GConditions, SDK.NetworkManager.Fast4GConditions]) {
          // Using i18nTitleKey as a title here because we only want to compare the parameters of the network conditions.
          if (SDK.NetworkManager.networkConditionsEqual(
                  {...preset, title: preset.i18nTitleKey || ''},
                  // The key below is not used, but we need it to satisfy TS.
                  {
                    ...step,
                    title: preset.i18nTitleKey || '',
                    key: `step_${i}_recorder_key` as SDK.NetworkManager.UserDefinedThrottlingConditionKey,
                  })) {
            settings.networkConditionsSettings.title = preset.title instanceof Function ? preset.title() : preset.title;
            settings.networkConditionsSettings.i18nTitleKey = preset.i18nTitleKey;
          }
        }
      }
    }
    return settings;
  }

  #getMainTarget(): SDK.Target.Target {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      throw new Error('Missing main page target');
    }
    return target;
  }

  #getSectionFromStep(step: Models.Schema.Step): Models.Section.Section|null {
    if (!this.sections) {
      return null;
    }

    for (const section of this.sections) {
      if (section.steps.indexOf(step) !== -1) {
        return section;
      }
    }

    return null;
  }

  #updateScreenshotsForSections(): void {
    if (!this.sections || !this.currentRecording) {
      return;
    }
    const storageName = this.currentRecording.storageName;
    for (let i = 0; i < this.sections.length; i++) {
      const screenshot = this.#screenshotStorage.getScreenshotForSection(storageName, i);
      this.sections[i].screenshot = screenshot || undefined;
    }
    this.requestUpdate();
  }

  #onAbortReplay(): void {
    this.recordingPlayer?.abort();
  }

  async #onPlayViaExtension(extension: Extensions.ExtensionManager.Extension): Promise<void> {
    if (!this.currentRecording || !this.#replayAllowed) {
      return;
    }
    const pluginManager = PublicExtensions.RecorderPluginManager.RecorderPluginManager.instance();

    if (this.#extensionViewShowRequestedListener) {
      pluginManager.removeEventListener(
          PublicExtensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED,
          this.#extensionViewShowRequestedListener,
      );
      this.#extensionViewShowRequestedListener = undefined;
    }

    let resolveView: (descriptor: PublicExtensions.RecorderPluginManager.ViewDescriptor) => void;
    const promise = new Promise<PublicExtensions.RecorderPluginManager.ViewDescriptor>(resolve => {
      resolveView = resolve;
    });

    this.#extensionViewShowRequestedListener =
        (event: Common.EventTarget.EventTargetEvent<PublicExtensions.RecorderPluginManager.ViewDescriptor>): void => {
          const descriptor = event.data;
          if (descriptor.extensionOrigin === extension.getOrigin()) {
            if (this.#extensionViewShowRequestedListener) {
              pluginManager.removeEventListener(
                  PublicExtensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED,
                  this.#extensionViewShowRequestedListener,
              );
              this.#extensionViewShowRequestedListener = undefined;
            }
            resolveView(descriptor);
          }
        };

    pluginManager.addEventListener(
        PublicExtensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED,
        this.#extensionViewShowRequestedListener,
    );

    extension.replay(this.currentRecording.flow);
    const descriptor = await promise;
    this.viewDescriptor = descriptor;
    Host.userMetrics.recordingReplayStarted(Host.UserMetrics.RecordingReplayStarted.REPLAY_VIA_EXTENSION);
  }

  async #onPlayRecording(event: ViewPlayRecordingEvent): Promise<void> {
    if (!this.currentRecording || !this.#replayAllowed) {
      return;
    }
    if (this.viewDescriptor) {
      this.viewDescriptor = undefined;
    }
    if (this.#extensionViewShowRequestedListener) {
      PublicExtensions.RecorderPluginManager.RecorderPluginManager.instance().removeEventListener(
          PublicExtensions.RecorderPluginManager.Events.SHOW_VIEW_REQUESTED,
          this.#extensionViewShowRequestedListener,
      );
      this.#extensionViewShowRequestedListener = undefined;
    }
    if (event.extension) {
      return await this.#onPlayViaExtension(event.extension);
    }
    Host.userMetrics.recordingReplayStarted(
        event.targetPanel !== TargetPanel.DEFAULT ?
            Host.UserMetrics.RecordingReplayStarted.REPLAY_WITH_PERFORMANCE_TRACING :
            Host.UserMetrics.RecordingReplayStarted.REPLAY_ONLY);
    this.#replayState.isPlaying = true;
    this.currentStep = undefined;
    this.recordingError = undefined;
    this.lastReplayResult = undefined;
    const currentRecording = this.currentRecording;
    this.#clearError();

    await this.#disableDeviceModeIfEnabled();

    this.recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
        this.currentRecording.flow, {speed: event.speed, breakpointIndexes: this.#stepBreakpointIndexes});

    const withPerformanceTrace = event.targetPanel === TargetPanel.PERFORMANCE_PANEL;
    const sectionsWithScreenshot = new Set();
    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STEP, async ({data: {step, resolve}}) => {
      this.currentStep = step;
      const currentSection = this.#getSectionFromStep(step);
      if (this.sections && currentSection && !sectionsWithScreenshot.has(currentSection)) {
        sectionsWithScreenshot.add(currentSection);
        const currentSectionIndex = this.sections.indexOf(currentSection);
        const screenshot = await Models.ScreenshotUtils.takeScreenshot();
        currentSection.screenshot = screenshot;
        Models.ScreenshotStorage.ScreenshotStorage.instance().storeScreenshotForSection(
            currentRecording.storageName, currentSectionIndex, screenshot);
      }
      resolve();
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.STOP, () => {
      this.#replayState.isPausedOnBreakpoint = true;
      this.requestUpdate();
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.CONTINUE, () => {
      this.#replayState.isPausedOnBreakpoint = false;
      this.requestUpdate();
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ERROR, ({data: error}) => {
      this.recordingError = error;
      if (!withPerformanceTrace) {
        this.#replayState.isPlaying = false;
        this.recordingPlayer = undefined;
      }
      this.lastReplayResult = Models.RecordingPlayer.ReplayResult.FAILURE;
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.startsWith('could not find element')) {
        Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.TIMEOUT_ERROR_SELECTORS);
      } else if (errorMessage.startsWith('waiting for target failed')) {
        Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.TIMEOUT_ERROR_TARGET);
      } else {
        Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.OTHER_ERROR);
      }
      // Dispatch an event for e2e testing.
      this.element.dispatchEvent(new Events.ReplayFinishedEvent());
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.DONE, () => {
      if (!withPerformanceTrace) {
        this.#replayState.isPlaying = false;
        this.recordingPlayer = undefined;
      }
      this.lastReplayResult = Models.RecordingPlayer.ReplayResult.SUCCESS;
      // Dispatch an event for e2e testing.
      this.element.dispatchEvent(new Events.ReplayFinishedEvent());
      Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.SUCCESS);
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.ABORT, () => {
      this.currentStep = undefined;
      this.recordingError = undefined;
      this.lastReplayResult = undefined;
      this.#replayState.isPlaying = false;
    });

    let resolveWithEvents = (_events: Object[]): void => {};
    const eventsPromise = new Promise<Object[]>((resolve): void => {
      resolveWithEvents = resolve;
    });

    let performanceTracing = null;
    switch (event.targetPanel) {
      case TargetPanel.PERFORMANCE_PANEL:
        performanceTracing = new Tracing.PerformanceTracing.PerformanceTracing(this.#getMainTarget(), {
          tracingBufferUsage(): void{},
          eventsRetrievalProgress(): void{},
          tracingComplete(events: Object[]): void {
            resolveWithEvents(events);
          },
        });
        break;
    }

    if (performanceTracing) {
      await performanceTracing.start();
    }

    this.#setTouchEmulationAllowed(false);
    await this.recordingPlayer.play();
    this.#setTouchEmulationAllowed(true);

    if (performanceTracing) {
      await performanceTracing.stop();
      const events = await eventsPromise;
      this.#replayState.isPlaying = false;
      this.recordingPlayer = undefined;
      await UI.InspectorView.InspectorView.instance().showPanel(event.targetPanel as string);
      if (event.targetPanel === TargetPanel.PERFORMANCE_PANEL) {
        // Note: this is not passing any metadata to the Performance panel.
        const trace = new SDK.TraceObject.TraceObject(events as Trace.Types.Events.Event[]);
        void Common.Revealer.reveal(trace);
      }
    }
  }

  async #disableDeviceModeIfEnabled(): Promise<void> {
    try {
      const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
      if (model.isDeviceModeOn()) {
        model.toggleDeviceMode();
        const emulationModel = this.#getMainTarget().model(SDK.EmulationModel.EmulationModel);
        await emulationModel?.emulateDevice(null);
      }
    } catch {
      // in the hosted mode, when the DeviceMode toolbar is not supported,
      // Emulation.DeviceModeView.DeviceModeView.instance throws an exception.
    }
  }

  #setTouchEmulationAllowed(touchEmulationAllowed: boolean): void {
    const emulationModel = this.#getMainTarget().model(SDK.EmulationModel.EmulationModel);
    emulationModel?.setTouchEmulationAllowed(touchEmulationAllowed);
  }

  async #onSetRecording(event: Event): Promise<void> {
    const json = JSON.parse((event as CustomEvent).detail);
    this.#setCurrentRecording(await this.#storage.upsertRecording(Models.SchemaUtils.parse(json)));
    this.#setCurrentPage(Pages.RECORDING_PAGE);
    this.#clearError();
    this.element.dispatchEvent(new Events.SetRecordingFinishedEvent());
  }

  // Used by e2e tests to inspect the current recording.
  getUserFlow(): Models.Schema.UserFlow|undefined {
    return this.currentRecording?.flow;
  }

  async #handleRecordingChanged(currentStep: Models.Schema.Step, newStep: Models.Schema.Step): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    const recording = {
      ...this.currentRecording,
      flow: {
        ...this.currentRecording.flow,
        steps: this.currentRecording.flow.steps.map(step => step === currentStep ? newStep : step),
      },
    };
    this.#setCurrentRecording(await this.#storage.upsertRecording(
                                  recording.flow,
                                  recording.storageName,
                                  ),
                              {keepBreakpoints: true, updateSession: true});
  }

  async #handleStepAdded(stepOrSection: Models.Schema.Step|Models.Section.Section,
                         position: AddStepPosition): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    let step;
    let actualPosition = position;
    if ('steps' in stepOrSection) {
      // section
      const sectionIdx = this.sections?.indexOf(stepOrSection);
      if (sectionIdx === undefined || sectionIdx === -1) {
        throw new Error('There is no section to add a step to');
      }
      if (position === AddStepPosition.AFTER) {
        if (this.sections?.[sectionIdx].steps.length) {
          step = this.sections?.[sectionIdx].steps[0];
          actualPosition = AddStepPosition.BEFORE;
        } else {
          step = this.sections?.[sectionIdx].causingStep;
          actualPosition = AddStepPosition.AFTER;
        }
      } else {
        if (sectionIdx <= 0) {
          throw new Error('There is no section to add a step to');
        }
        const prevSection = this.sections?.[sectionIdx - 1];
        step = prevSection?.steps[prevSection.steps.length - 1];
        actualPosition = AddStepPosition.AFTER;
      }
    } else {
      // step
      step = stepOrSection;
    }
    if (!step) {
      throw new Error('Anchor step is not found when adding a step');
    }
    const steps = this.currentRecording.flow.steps;
    const currentIndex = steps.indexOf(step);
    const indexToInsertAt = currentIndex + (actualPosition === AddStepPosition.BEFORE ? 0 : 1);
    steps.splice(indexToInsertAt, 0, {type: Models.Schema.StepType.WaitForElement, selectors: ['body']});
    const recording = {...this.currentRecording, flow: {...this.currentRecording.flow, steps}};
    this.#stepBreakpointIndexes = new Set([...this.#stepBreakpointIndexes.values()].map(breakpointIndex => {
      if (indexToInsertAt > breakpointIndex) {
        return breakpointIndex;
      }

      return breakpointIndex + 1;
    }));
    this.#setCurrentRecording(await this.#storage.upsertRecording(
                                  recording.flow,
                                  recording.storageName,
                                  ),
                              {keepBreakpoints: true, updateSession: true});
  }

  async #handleRecordingTitleChanged(title: string): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }

    const flow = {...this.currentRecording.flow, title};
    this.#setCurrentRecording(await this.#storage.upsertRecording(
        flow,
        this.currentRecording.storageName,
        ));
  }

  async #handleStepRemoved(step: Models.Schema.Step): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }

    const steps = this.currentRecording.flow.steps;
    const currentIndex = steps.indexOf(step);
    steps.splice(currentIndex, 1);
    const flow = {...this.currentRecording.flow, steps};
    this.#stepBreakpointIndexes = new Set([...this.#stepBreakpointIndexes.values()]
                                              .map(breakpointIndex => {
                                                if (currentIndex > breakpointIndex) {
                                                  return breakpointIndex;
                                                }

                                                if (currentIndex === breakpointIndex) {
                                                  return -1;
                                                }

                                                return breakpointIndex - 1;
                                              })
                                              .filter(index => index >= 0));
    this.#setCurrentRecording(await this.#storage.upsertRecording(
                                  flow,
                                  this.currentRecording.storageName,
                                  ),
                              {keepBreakpoints: true, updateSession: true});
  }

  async #onNetworkConditionsChanged(data?: SDK.NetworkManager.Conditions): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    const navigateIdx = this.currentRecording.flow.steps.findIndex(step => step.type === 'navigate');
    if (navigateIdx === -1) {
      throw new Error('Current recording does not have a navigate step');
    }
    const emulateNetworkConditionsIdx = this.currentRecording.flow.steps.findIndex((step, idx) => {
      if (idx >= navigateIdx) {
        return false;
      }
      return step.type === 'emulateNetworkConditions';
    });
    if (!data) {
      // Delete step if present.
      if (emulateNetworkConditionsIdx !== -1) {
        this.currentRecording.flow.steps.splice(emulateNetworkConditionsIdx, 1);
      }
    } else if (emulateNetworkConditionsIdx === -1) {
      // Insert at the first position.
      this.currentRecording.flow.steps.splice(
          0, 0,
          Models.SchemaUtils.createEmulateNetworkConditionsStep(
              {download: data.download, upload: data.upload, latency: data.latency}));
    } else {
      // Update existing step.
      const step =
          this.currentRecording.flow.steps[emulateNetworkConditionsIdx] as Models.Schema.EmulateNetworkConditionsStep;
      step.download = data.download;
      step.upload = data.upload;
      step.latency = data.latency;
    }
    this.#setCurrentRecording(await this.#storage.upsertRecording(
        this.currentRecording.flow,
        this.currentRecording.storageName,
        ));
  }

  async #onTimeoutChanged(timeout?: number): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    this.currentRecording.flow.timeout = timeout;
    this.#setCurrentRecording(await this.#storage.upsertRecording(
        this.currentRecording.flow,
        this.currentRecording.storageName,
        ));
  }

  async #onDeleteRecording(storageNameOrEvent: string|Event): Promise<void> {
    let storageName: string;
    if (typeof storageNameOrEvent === 'string') {
      storageName = storageNameOrEvent;
    } else {
      storageNameOrEvent.stopPropagation();
      if (!this.currentRecording) {
        return;
      }
      storageName = this.currentRecording.storageName;
    }

    await this.#storage.deleteRecording(storageName);
    this.#screenshotStorage.deleteScreenshotsForRecording(storageName);
    this.requestUpdate();

    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.recordingDeleted));
    if ((await this.#storage.getRecordings()).length) {
      this.#setCurrentPage(Pages.ALL_RECORDINGS_PAGE);
    } else {
      this.#setCurrentPage(Pages.START_PAGE);
    }
    this.#setCurrentRecording(undefined);
    this.#clearError();
  }

  #onCreateNewRecording(event?: Event): void {
    event?.stopPropagation();
    this.#setCurrentPage(Pages.CREATE_RECORDING_PAGE);
    this.#clearError();
  }

  async #onRecordingStarted(
      data: {name: string, selectorTypesToRecord: Models.Schema.SelectorType[], selectorAttribute?: string}):
      Promise<void> {
    // Recording is not available in device mode.
    await this.#disableDeviceModeIfEnabled();

    // Setting up some variables to notify the user we are initializing a recording.
    this.isToggling = true;
    this.#clearError();

    // -- Recording logic starts here --
    Host.userMetrics.recordingToggled(Host.UserMetrics.RecordingToggled.RECORDING_STARTED);
    this.currentRecordingSession = new Models.RecordingSession.RecordingSession(this.#getMainTarget(), {
      title: data.name,
      selectorAttribute: data.selectorAttribute,
      selectorTypesToRecord: data.selectorTypesToRecord.length ? data.selectorTypesToRecord :
                                                                 Object.values(Models.Schema.SelectorType),
    });
    this.#setCurrentRecording(await this.#storage.upsertRecording(this.currentRecordingSession.cloneUserFlow()));

    let previousSectionIndex = -1;
    let screenshotPromise:|Promise<Models.ScreenshotStorage.Screenshot>|undefined;
    const takeScreenshot = async(currentRecording: StoredRecording): Promise<void> => {
      if (!this.sections) {
        throw new Error('Could not find sections.');
      }

      const currentSectionIndex = this.sections.length - 1;
      const currentSection = this.sections[currentSectionIndex];
      if (screenshotPromise || previousSectionIndex === currentSectionIndex) {
        return;
      }

      screenshotPromise = Models.ScreenshotUtils.takeScreenshot();
      const screenshot = await screenshotPromise;
      screenshotPromise = undefined;
      currentSection.screenshot = screenshot;
      Models.ScreenshotStorage.ScreenshotStorage.instance().storeScreenshotForSection(currentRecording.storageName,
                                                                                      currentSectionIndex, screenshot);
      previousSectionIndex = currentSectionIndex;
      this.#updateScreenshotsForSections();
    };

    this.currentRecordingSession.addEventListener(Models.RecordingSession.Events.RECORDING_UPDATED,
                                                  async ({data}: {data: Models.Schema.UserFlow}) => {
                                                    if (!this.currentRecording) {
                                                      throw new Error('No current recording found');
                                                    }
                                                    this.#setCurrentRecording(await this.#storage.upsertRecording(
                                                        data,
                                                        this.currentRecording.storageName,
                                                        ));
                                                    this.#recordingView?.scrollToBottom();

                                                    await takeScreenshot(this.currentRecording);
                                                  });

    this.currentRecordingSession.addEventListener(
        Models.RecordingSession.Events.RECORDING_STOPPED, async ({data}: {data: Models.Schema.UserFlow}) => {
          if (!this.currentRecording) {
            throw new Error('No current recording found');
          }
          Host.userMetrics.keyboardShortcutFired(Actions.RecorderActions.START_RECORDING);
          this.#setCurrentRecording(await this.#storage.upsertRecording(
              data,
              this.currentRecording.storageName,
              ));
          await this.#onRecordingFinished();
        });

    await this.currentRecordingSession.start();
    // -- Recording logic ends here --

    // Setting up some variables to notify the user we are finished initialization.
    this.isToggling = false;
    this.isRecording = true;
    this.#setCurrentPage(Pages.RECORDING_PAGE);

    // Dispatch an event for e2e testing.
    this.element.dispatchEvent(new Events.RecordingStateChangedEvent((this.currentRecording as StoredRecording).flow));
  }

  async #onRecordingFinished(): Promise<void> {
    if (!this.currentRecording || !this.currentRecordingSession) {
      throw new Error('Recording was never started');
    }

    // Setting up some variables to notify the user we are finalizing a recording.
    this.isToggling = true;
    this.#clearError();

    // -- Recording logic starts here --
    Host.userMetrics.recordingToggled(Host.UserMetrics.RecordingToggled.RECORDING_FINISHED);
    await this.currentRecordingSession.stop();
    this.currentRecordingSession = undefined;
    // -- Recording logic ends here --

    // Setting up some variables to notify the user we are finished finalizing.
    this.isToggling = false;
    this.isRecording = false;

    // Dispatch an event for e2e testing.
    this.element.dispatchEvent(new Events.RecordingStateChangedEvent(this.currentRecording.flow));
  }

  async onRecordingCancelled(): Promise<void> {
    if (this.previousPage) {
      this.#setCurrentPage(this.previousPage);
    }
  }

  async #onRecordingSelected(storageNameOrEvent: string|Event): Promise<void> {
    let storageName: string;
    if (typeof storageNameOrEvent === 'string') {
      storageName = storageNameOrEvent;
    } else {
      storageName = ((storageNameOrEvent as InputEvent).target as HTMLSelectElement)?.value;
    }
    this.#setCurrentRecording(await this.#storage.getRecording(storageName));
    if (this.currentRecording) {
      this.#setCurrentPage(Pages.RECORDING_PAGE);
    } else if (storageName === Pages.START_PAGE) {
      this.#setCurrentPage(Pages.START_PAGE);
    } else if (storageName === Pages.ALL_RECORDINGS_PAGE) {
      this.#setCurrentPage(Pages.ALL_RECORDINGS_PAGE);
    }
  }

  async #onExportOptionSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): Promise<void> {
    if (typeof event.itemValue !== 'string') {
      throw new Error('Invalid export option value');
    }
    if (event.itemValue === GET_EXTENSIONS_MENU_ITEM) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(GET_EXTENSIONS_URL);
      return;
    }
    if (!this.currentRecording) {
      throw new Error('No recording selected');
    }
    const id = event.itemValue;
    const byId = (converter: Converters.Converter.Converter): boolean => converter.getId() === id;
    const isBuiltIn = this.#builtInConverters.some(byId);
    const converter = this.#builtInConverters.find(byId) || this.extensionConverters.find(byId);
    if (!converter) {
      throw new Error('No recording selected');
    }
    const [content] = await converter.stringify(this.currentRecording.flow);
    await this.#exportContent(converter.getFilename(this.currentRecording.flow), content);
    if (isBuiltIn) {
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.recordingExported));
    } else if (converter.getId().startsWith(Converters.ExtensionConverter.EXTENSION_PREFIX)) {
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.recordingExported));
    } else {
      throw new Error('Could not find a metric for the export option with id = ' + id);
    }
  }

  async #exportContent(suggestedName: string, data: string): Promise<void> {
    try {
      const handle = await window.showSaveFilePicker({suggestedName});
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
    } catch (error) {
      // If the user aborts the action no need to report it, otherwise do.
      if (error.name === 'AbortError') {
        return;
      }

      throw error;
    }
  }

  async #handleAddAssertionEvent(): Promise<void> {
    if (!this.currentRecordingSession || !this.currentRecording) {
      return;
    }
    const flow = this.currentRecordingSession.cloneUserFlow();
    flow.steps.push({type: 'waitForElement' as Models.Schema.StepType.WaitForElement, selectors: [['.cls']]});
    this.#setCurrentRecording(await this.#storage.upsertRecording(
                                  flow,
                                  this.currentRecording.storageName,
                                  ),
                              {keepBreakpoints: true, updateSession: true});
    await this.updateComplete;
    // FIXME: call a method on the recording view widget.
    await this.#recordingView?.updateComplete;
    this.#recordingView?.contentElement?.querySelector('.section:last-child .step-view-widget:last-of-type')
        ?.shadowRoot?.querySelector<HTMLElement>('.action')
        ?.click();
  }

  async #acknowledgeImportNotice(): Promise<boolean> {
    if (this.#disableRecorderImportWarningSetting.get()) {
      return true;
    }

    if (Root.Runtime.Runtime.queryParam('isChromeForTesting') ||
        Root.Runtime.Runtime.queryParam('disableSelfXssWarnings') || this.#selfXssWarningDisabledSetting.get()) {
      return true;
    }

    const result = await Dialogs.TypeToAllowDialog.TypeToAllowDialog.show({
      jslogContext: {
        input: 'confirm-import-recording-input',
        dialog: 'confirm-import-recording-dialog',
      },
      message: i18nString(UIStrings.doNotImport, {PH1: i18nString(UIStrings.allowImporting)}),
      header: i18nString(UIStrings.doYouTrustThisCode),
      typePhrase: i18nString(UIStrings.allowImporting),
      inputPlaceholder: i18nString(UIStrings.typeAllowImporting, {PH1: i18nString(UIStrings.allowImporting)}),
    });

    if (result) {
      this.#disableRecorderImportWarningSetting.set(true);
    }

    return result;
  }

  async #onImportRecording(event: Event): Promise<void> {
    event.stopPropagation();

    this.#clearError();

    if (await this.#acknowledgeImportNotice()) {
      this.#fileSelector = UI.UIUtils.createFileSelectorElement(this.#importFile.bind(this));
      this.#fileSelector.click();
    }
  }

  async #onPlayRecordingByName(storageName: string): Promise<void> {
    await this.#onRecordingSelected(storageName);
    await this.#onPlayRecording({targetPanel: TargetPanel.DEFAULT, speed: this.#recorderSettings.speed});
  }

  #onAddBreakpoint = (index: number): void => {
    this.#stepBreakpointIndexes = structuredClone(this.#stepBreakpointIndexes);
    this.#stepBreakpointIndexes.add(index);
    this.recordingPlayer?.updateBreakpointIndexes(this.#stepBreakpointIndexes);
    this.requestUpdate();
  };

  #onRemoveBreakpoint = (index: number): void => {
    this.#stepBreakpointIndexes = structuredClone(this.#stepBreakpointIndexes);
    this.#stepBreakpointIndexes.delete(index);
    this.recordingPlayer?.updateBreakpointIndexes(this.#stepBreakpointIndexes);
    this.requestUpdate();
  };

  #onExtensionViewClosed(): void {
    this.viewDescriptor = undefined;
  }

  handleActions(actionId: Actions.RecorderActions): void {
    if (!this.isActionPossible(actionId)) {
      return;
    }

    switch (actionId) {
      case Actions.RecorderActions.CREATE_RECORDING:
        this.#onCreateNewRecording();
        return;

      case Actions.RecorderActions.START_RECORDING:
        if (this.currentPage !== Pages.CREATE_RECORDING_PAGE && !this.isRecording) {
          this.#shortcutHelper.handleShortcut(this.#onRecordingStarted.bind(this, {
            name: this.#recorderSettings.defaultTitle,
            selectorTypesToRecord: this.#recorderSettings.defaultSelectors,
            selectorAttribute: this.#recorderSettings.selectorAttribute ? this.#recorderSettings.selectorAttribute :
                                                                          undefined,
          }));
        } else if (this.currentPage === Pages.CREATE_RECORDING_PAGE) {
          if (this.#createRecordingView) {
            this.#shortcutHelper.handleShortcut(() => {
              this.#createRecordingView?.startRecording();
            });
          }
        } else if (this.isRecording) {
          void this.#onRecordingFinished();
        }
        return;

      case Actions.RecorderActions.REPLAY_RECORDING:
        void this.#onPlayRecording({targetPanel: TargetPanel.DEFAULT, speed: this.#recorderSettings.speed});
        return;

      case Actions.RecorderActions.TOGGLE_CODE_VIEW: {
        this.#recordingView?.showCodeToggle();
        return;
      }
    }
  }

  isActionPossible(actionId: Actions.RecorderActions): boolean {
    switch (actionId) {
      case Actions.RecorderActions.CREATE_RECORDING:
        return !this.isRecording && !this.#replayState.isPlaying;
      case Actions.RecorderActions.START_RECORDING:
        return !this.#replayState.isPlaying;
      case Actions.RecorderActions.REPLAY_RECORDING:
        return (this.currentPage === Pages.RECORDING_PAGE && !this.#replayState.isPlaying);
      case Actions.RecorderActions.TOGGLE_CODE_VIEW:
        return this.currentPage === Pages.RECORDING_PAGE;
      case Actions.RecorderActions.COPY_RECORDING_OR_STEP:
        // This action is handled in the RecordingView
        // It relies on browser `copy` event.
        return false;
    }
  }

  #getShortcutsInfo(): Dialogs.ShortcutDialog.Shortcut[] {
    const getBindingForAction = (action: Actions.RecorderActions): Dialogs.ShortcutDialog.ShortcutPart[][] => {
      const shortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(action);
      const shortcutsWithSplitBindings = shortcuts.map(shortcut => shortcut.title().split(/[\s+]+/).map(word => {
        return {key: word.trim()};
      }));
      return shortcutsWithSplitBindings;
    };

    return [
      {
        title: i18nString(UIStrings.startStopRecording),
        rows: getBindingForAction(Actions.RecorderActions.START_RECORDING),
      },
      {
        title: i18nString(UIStrings.replayRecording),
        rows: getBindingForAction(Actions.RecorderActions.REPLAY_RECORDING),
      },
      {
        title: i18nString(UIStrings.copyShortcut),
        rows: Host.Platform.isMac() ? [[{key: '⌘'}, {key: 'C'}]] : [[{key: 'Ctrl'}, {key: 'C'}]],
      },
      {
        title: i18nString(UIStrings.toggleCode),
        rows: getBindingForAction(Actions.RecorderActions.TOGGLE_CODE_VIEW),
      },
    ];
  }

  #getExportMenuButton = (): Buttons.Button.Button => {
    if (!this.#exportMenuButton) {
      throw new Error('#exportMenuButton not found');
    }
    return this.#exportMenuButton;
  };

  #onExportRecording(event: Event): void {
    event.stopPropagation();
    this.#clearError();
    this.exportMenuExpanded = !this.exportMenuExpanded;
  }

  #onExportMenuClosed(): void {
    this.exportMenuExpanded = false;
  }

  override performUpdate(): void {
    const recordings = this.#storage.getRecordings();
    const that = this;
    const output = {
      set exportMenuButton(el: Buttons.Button.Button) {
        that.#exportMenuButton = el;
      },
      set recordingView(widget: RecordingView) {
        that.#recordingView = widget;
      },
      set createRecordingView(widget: CreateRecordingView) {
        that.#createRecordingView = widget;
      },
    };
    this.#view({
      recordings,
      currentRecording: this.currentRecording,
      currentPage: this.currentPage,
      isRecording: this.isRecording,
      isToggling: this.isToggling,
      importError: this.importError,
      recordingError: this.recordingError,
      sections: this.sections ?? [],
      settings: this.settings,
      recorderSettings: this.#recorderSettings,
      lastReplayResult: this.lastReplayResult,
      replayAllowed: this.#replayAllowed,
      breakpointIndexes: this.#stepBreakpointIndexes,
      builtInConverters: this.#builtInConverters,
      extensionConverters: this.extensionConverters,
      replayExtensions: this.replayExtensions,
      extensionDescriptor: this.viewDescriptor,
      exportMenuExpanded: this.exportMenuExpanded,
      replayState: this.#replayState,
      shortcutsInfo: this.#getShortcutsInfo(),
      currentStep: this.currentStep,

      onCreateNewRecording: this.#onCreateNewRecording.bind(this),
      onImportRecording: this.#onImportRecording.bind(this),
      onExportRecording: this.#onExportRecording.bind(this),
      onDeleteRecording: this.#onDeleteRecording.bind(this),
      onRecordingSelected: this.#onRecordingSelected.bind(this),
      onPlayRecordingByName: this.#onPlayRecordingByName.bind(this),
      onPlayRecording: this.#onPlayRecording.bind(this),
      onAbortReplay: this.#onAbortReplay.bind(this),
      onNetworkConditionsChanged: this.#onNetworkConditionsChanged.bind(this),
      onTimeoutChanged: this.#onTimeoutChanged.bind(this),
      handleRecordingTitleChanged: this.#handleRecordingTitleChanged.bind(this),
      handleRecordingChanged: this.#handleRecordingChanged.bind(this),
      handleStepAdded: this.#handleStepAdded.bind(this),
      handleStepRemoved: this.#handleStepRemoved.bind(this),
      onAddBreakpoint: this.#onAddBreakpoint.bind(this),
      onRemoveBreakpoint: this.#onRemoveBreakpoint.bind(this),
      onExtensionViewClosed: this.#onExtensionViewClosed.bind(this),
      onExportMenuClosed: this.#onExportMenuClosed.bind(this),
      onExportOptionSelected: this.#onExportOptionSelected.bind(this),
      onRecordingFinished: this.#onRecordingFinished.bind(this),
      handleAddAssertionEvent: this.#handleAddAssertionEvent.bind(this),
      onSetRecording: this.#onSetRecording.bind(this),
      onContinueReplay: () => this.recordingPlayer?.continue(),
      onStepOverReplay: () => this.recordingPlayer?.stepOver(),
      getExportMenuButton: this.#getExportMenuButton.bind(this),
      onRecordingStarted: this.#onRecordingStarted.bind(this),
      onRecordingCancelled: this.onRecordingCancelled.bind(this),
    },
               output, this.contentElement);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(
      _context: UI.Context.Context,
      actionId: Actions.RecorderActions,
      ): boolean {
    void (async () => {
      await UI.ViewManager.ViewManager.instance().showView(
          RecorderPanel.panelName,
      );
      const view = UI.ViewManager.ViewManager.instance().view(
          RecorderPanel.panelName,
      );

      if (view) {
        const widget = (await view.widget()) as RecorderPanel;

        widget.handleActions(actionId);
      }
    })();
    return true;
  }
}
