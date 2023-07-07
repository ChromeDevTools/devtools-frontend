// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as TraceEngine from '../../models/trace/trace.js';
import * as PublicExtensions from '../../models/extensions/extensions.js';
import * as Emulation from '../../panels/emulation/emulation.js';
import * as Timeline from '../../panels/timeline/timeline.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../ui/components/helpers/helpers.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as Menus from '../../ui/components/menus/menus.js';
import * as Dialogs from '../../ui/components/dialogs/dialogs.js';
import type * as Controllers from './controllers/controllers.js';
import * as Components from './components/components.js';

import {type AddBreakpointEvent, type RemoveBreakpointEvent} from './components/StepView.js';
import * as Converters from './converters/converters.js';
import * as Extensions from './extensions/extensions.js';

import * as Models from './models/models.js';
import recorderControllerStyles from './recorderController.css.js';
import * as Events from './RecorderEvents.js';
import * as Actions from './recorder-actions.js';

const {html, Decorators, LitElement} = LitHtml;
const {customElement, state} = Decorators;

const UIStrings = {
  /**
   * @description The title of the button that leads to a page for creating a new recording.
   */
  createRecording: 'Create a new recording',
  /**
   * @description The title of the button that allows importing a recording.
   */
  importRecording: 'Import recording',
  /**
   * @description The title of the button that deletes the recording
   */
  deleteRecording: 'Delete recording',
  /**
   * @description The title of the button that continues the replay
   */
  continueReplay: 'Continue',
  /**
   * @description The title of the button that executes only one step in the replay
   */
  stepOverReplay: 'Execute one step',
  /**
   * @description The title of the button that opens a menu with various options of exporting a recording to file.
   */
  exportRecording: 'Export',
  /**
   * @description The title of shortcut for starting and stopping recording.
   */
  startStopRecording: 'Start/Stop recording',
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
   * @description The title of the menu group in the export menu of the Recorder
   * panel that is followed by the list of export formats available via browser
   * extensions.
   */
  exportViaExtensions: 'Export via extensions',
  /**
   * @description The title of the menu option that leads to a page that lists
   * all browsers extensions available for Recorder.
   */
  getExtensions: 'Get extensions…',
  /**
   * @description The button label that leads to the feedback form for Recorder.
   */
  sendFeedback: 'Send feedback',
};
const str_ = i18n.i18n.registerUIStrings('panels/recorder/RecorderController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const GET_EXTENSIONS_MENU_ITEM = 'get-extensions-link';
const GET_EXTENSIONS_URL = 'https://goo.gle/recorder-extension-list' as Platform.DevToolsPath.UrlString;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-recorder-controller': RecorderController;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: unknown): Promise<void>;
    close(): Promise<void>;
  }

  interface FileSystemHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface Window {
    showSaveFilePicker(opts: unknown): Promise<FileSystemHandle>;
  }
}

interface StoredRecording {
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
  StartPage = 'StartPage',
  AllRecordingsPage = 'AllRecordingsPage',
  CreateRecordingPage = 'CreateRecordingPage',
  RecordingPage = 'RecordingPage',
}

const CONVERTER_ID_TO_METRIC: Record<string, Host.UserMetrics.RecordingExported|undefined> = {
  [Models.ConverterIds.ConverterIds.JSON]: Host.UserMetrics.RecordingExported.ToJSON,
  [Models.ConverterIds.ConverterIds.Replay]: Host.UserMetrics.RecordingExported.ToPuppeteerReplay,
  [Models.ConverterIds.ConverterIds.Puppeteer]: Host.UserMetrics.RecordingExported.ToPuppeteer,
  [Models.ConverterIds.ConverterIds.Lighthouse]: Host.UserMetrics.RecordingExported.ToLighthouse,
};

@customElement('devtools-recorder-controller')
export class RecorderController extends LitElement {
  static override readonly styles = [recorderControllerStyles];

  @state() declare private currentRecordingSession?: Models.RecordingSession.RecordingSession;
  @state() declare private currentRecording: StoredRecording|undefined;
  @state() declare private currentStep?: Models.Schema.Step;
  @state() declare private recordingError?: Error;

  #storage = Models.RecordingStorage.RecordingStorage.instance();
  #screenshotStorage = Models.ScreenshotStorage.ScreenshotStorage.instance();

  @state() declare private isRecording: boolean;
  @state() declare private isToggling: boolean;

  // TODO: we keep the functionality to allow/disallow replay but right now it's not used.
  // It can be used to decide if we allow replay on a certain target for example.
  #replayAllowed = true;
  @state() declare private recordingPlayer?: Models.RecordingPlayer.RecordingPlayer;
  @state() declare private lastReplayResult?: Models.RecordingPlayer.ReplayResult;
  readonly #replayState: Components.RecordingView.ReplayState = {isPlaying: false, isPausedOnBreakpoint: false};

  @state() declare private currentPage: Pages;
  @state() declare private previousPage?: Pages;
  #fileSelector?: HTMLInputElement;

  @state() declare private sections?: Models.Section.Section[];
  @state() declare private settings?: Models.RecordingSettings.RecordingSettings;

  @state() declare private importError?: Error;

  @state() declare private exportMenuExpanded: boolean;
  #exportMenuButton: Buttons.Button.Button|undefined;

  #stepBreakpointIndexes: Set<number> = new Set();

  #builtInConverters: Readonly<Converters.Converter.Converter[]>;
  @state() declare private extensionConverters: Converters.Converter.Converter[];
  @state() declare private replayExtensions: Extensions.ExtensionManager.Extension[];

  @state() declare private viewDescriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;

  #recorderSettings = new Models.RecorderSettings.RecorderSettings();
  #shortcutHelper = new Models.RecorderShortcutHelper.RecorderShortcutHelper();

  constructor() {
    super();

    this.isRecording = false;
    this.isToggling = false;
    this.exportMenuExpanded = false;

    this.currentPage = Pages.StartPage;
    if (this.#storage.getRecordings().length) {
      this.#setCurrentPage(Pages.AllRecordingsPage);
    }

    const textEditorIndent = Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
    this.#builtInConverters = Object.freeze([
      new Converters.JSONConverter.JSONConverter(textEditorIndent),
      new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter(textEditorIndent),
      new Converters.PuppeteerConverter.PuppeteerConverter(textEditorIndent),
      new Converters.LighthouseConverter.LighthouseConverter(textEditorIndent),
    ]);

    const extensionManager = Extensions.ExtensionManager.ExtensionManager.instance();
    this.#updateExtensions(extensionManager.extensions());
    extensionManager.addEventListener(Extensions.ExtensionManager.Events.ExtensionsUpdated, event => {
      this.#updateExtensions(event.data);
    });

    // used in e2e tests only.
    this.addEventListener('setrecording', (event: Event) => this.#onSetRecording(event));
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this.currentRecordingSession) {
      void this.currentRecordingSession.stop();
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

  setRecordingStateForTesting(state: Components.RecordingView.ReplayState): void {
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
    const reader = new Bindings.FileUtils.ChunkedFileReader(
        file,
        /* chunkSize */ 10000000);
    const success = await reader.read(outputStream);
    if (!success) {
      throw reader.error();
    }

    let flow: Models.Schema.UserFlow|undefined;
    try {
      flow = Models.SchemaUtils.parse(JSON.parse(outputStream.data()));
    } catch (error) {
      this.importError = error;
      return;
    }
    this.#setCurrentRecording(await this.#storage.saveRecording(flow));
    this.#setCurrentPage(Pages.RecordingPage);
    this.#clearError();
  }

  setCurrentRecordingForTesting(recording: StoredRecording|undefined): void {
    this.#setCurrentRecording(recording);
  }

  getSectionsForTesting(): Array<Models.Section.Section>|undefined {
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
        for (const preset
                 of [SDK.NetworkManager.OfflineConditions, SDK.NetworkManager.Slow3GConditions,
                     SDK.NetworkManager.Fast3GConditions]) {
          // Using i18nTitleKey as a title here because we only want to compare the parameters of the network conditions.
          if (SDK.NetworkManager.networkConditionsEqual(
                  {...preset, title: preset.i18nTitleKey || ''}, {...step, title: preset.i18nTitleKey || ''})) {
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
    const promise = pluginManager.once(PublicExtensions.RecorderPluginManager.Events.ShowViewRequested);
    extension.replay(this.currentRecording.flow);
    const descriptor = await promise;
    this.viewDescriptor = descriptor;
    Host.userMetrics.recordingReplayStarted(Host.UserMetrics.RecordingReplayStarted.ReplayViaExtension);
  }

  async #onPlayRecording(event: Components.RecordingView.PlayRecordingEvent): Promise<void> {
    if (!this.currentRecording || !this.#replayAllowed) {
      return;
    }
    if (this.viewDescriptor) {
      this.viewDescriptor = undefined;
    }
    if (event.data.extension) {
      return this.#onPlayViaExtension(event.data.extension);
    }
    Host.userMetrics.recordingReplayStarted(
        event.data.targetPanel !== Components.RecordingView.TargetPanel.Default ?
            Host.UserMetrics.RecordingReplayStarted.ReplayWithPerformanceTracing :
            Host.UserMetrics.RecordingReplayStarted.ReplayOnly);
    this.#replayState.isPlaying = true;
    this.currentStep = undefined;
    this.recordingError = undefined;
    this.lastReplayResult = undefined;
    const currentRecording = this.currentRecording;
    this.#clearError();

    await this.#disableDeviceModeIfEnabled();

    this.recordingPlayer = new Models.RecordingPlayer.RecordingPlayer(
        this.currentRecording.flow, {speed: event.data.speed, breakpointIndexes: this.#stepBreakpointIndexes});

    const withPerformanceTrace = event.data.targetPanel === Components.RecordingView.TargetPanel.PerformancePanel;
    const sectionsWithScreenshot = new Set();
    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.Step, async ({data: {step, resolve}}) => {
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

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.Stop, () => {
      this.#replayState.isPausedOnBreakpoint = true;
      this.requestUpdate();
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.Continue, () => {
      this.#replayState.isPausedOnBreakpoint = false;
      this.requestUpdate();
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.Error, ({data: error}) => {
      this.recordingError = error;
      if (!withPerformanceTrace) {
        this.#replayState.isPlaying = false;
        this.recordingPlayer = undefined;
      }
      this.lastReplayResult = Models.RecordingPlayer.ReplayResult.Failure;
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.startsWith('could not find element')) {
        Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.TimeoutErrorSelectors);
      } else if (errorMessage.startsWith('waiting for target failed')) {
        Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.TimeoutErrorTarget);
      } else {
        Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.OtherError);
      }
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.Done, () => {
      if (!withPerformanceTrace) {
        this.#replayState.isPlaying = false;
        this.recordingPlayer = undefined;
      }
      this.lastReplayResult = Models.RecordingPlayer.ReplayResult.Success;
      // Dispatch an event for e2e testing.
      this.dispatchEvent(new Events.ReplayFinishedEvent());
      Host.userMetrics.recordingReplayFinished(Host.UserMetrics.RecordingReplayFinished.Success);
    });

    this.recordingPlayer.addEventListener(Models.RecordingPlayer.Events.Abort, () => {
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
    switch (event.data?.targetPanel) {
      case Components.RecordingView.TargetPanel.PerformancePanel:
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
      await UI.InspectorView.InspectorView.instance().showPanel(event.data?.targetPanel as string);
      switch (event.data?.targetPanel) {
        case Components.RecordingView.TargetPanel.PerformancePanel:
          Timeline.TimelinePanel.TimelinePanel.instance().loadFromEvents(
              events as TraceEngine.TracingManager.EventPayload[]);
          break;
      }
    }
  }

  async #disableDeviceModeIfEnabled(): Promise<void> {
    try {
      const deviceModeWrapper = Emulation.DeviceModeWrapper.DeviceModeWrapper.instance();
      if (deviceModeWrapper.isDeviceModeOn()) {
        deviceModeWrapper.toggleDeviceMode();
        const emulationModel = this.#getMainTarget().model(SDK.EmulationModel.EmulationModel);
        await emulationModel?.emulateDevice(null);
      }
    } catch {
      // in the hosted mode, when the DeviceMode toolbar is not supported,
      // Emulation.DeviceModeWrapper.DeviceModeWrapper.instance throws an exception.
    }
  }

  #setTouchEmulationAllowed(touchEmulationAllowed: boolean): void {
    const emulationModel = this.#getMainTarget().model(SDK.EmulationModel.EmulationModel);
    emulationModel?.setTouchEmulationAllowed(touchEmulationAllowed);
  }

  async #onSetRecording(event: Event): Promise<void> {
    const json = JSON.parse((event as CustomEvent).detail);
    this.#setCurrentRecording(await this.#storage.saveRecording(Models.SchemaUtils.parse(json)));
    this.#setCurrentPage(Pages.RecordingPage);
    this.#clearError();
  }

  // Used by e2e tests to inspect the current recording.
  getUserFlow(): Models.Schema.UserFlow|undefined {
    return this.currentRecording?.flow;
  }

  async #handleRecordingChanged(event: Components.StepView.StepChanged): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    const recording = {
      ...this.currentRecording,
      flow: {
        ...this.currentRecording.flow,
        steps: this.currentRecording.flow.steps.map(step => step === event.currentStep ? event.newStep : step),
      },
    };
    this.#setCurrentRecording(
        await this.#storage.updateRecording(recording.storageName, recording.flow),
        {keepBreakpoints: true, updateSession: true});
  }

  async #handleStepAdded(event: Components.StepView.AddStep): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    const stepOrSection = event.stepOrSection;
    let step;
    let position = event.position;
    if ('steps' in stepOrSection) {
      // section
      const sectionIdx = this.sections?.indexOf(stepOrSection);
      if (sectionIdx === undefined || sectionIdx === -1) {
        throw new Error('There is no section to add a step to');
      }
      if (event.position === Components.StepView.AddStepPosition.AFTER) {
        if (this.sections?.[sectionIdx].steps.length) {
          step = this.sections?.[sectionIdx].steps[0];
          position = Components.StepView.AddStepPosition.BEFORE;
        } else {
          step = this.sections?.[sectionIdx].causingStep;
          position = Components.StepView.AddStepPosition.AFTER;
        }
      } else {
        if (sectionIdx <= 0) {
          throw new Error('There is no section to add a step to');
        }
        const prevSection = this.sections?.[sectionIdx - 1];
        step = prevSection?.steps[prevSection.steps.length - 1];
        position = Components.StepView.AddStepPosition.AFTER;
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
    const indexToInsertAt = currentIndex + (position === Components.StepView.AddStepPosition.BEFORE ? 0 : 1);
    steps.splice(indexToInsertAt, 0, {type: Models.Schema.StepType.WaitForElement, selectors: ['body']});
    const recording = {...this.currentRecording, flow: {...this.currentRecording.flow, steps}};
    Host.userMetrics.recordingEdited(Host.UserMetrics.RecordingEdited.StepAdded);
    this.#stepBreakpointIndexes = new Set([...this.#stepBreakpointIndexes.values()].map(breakpointIndex => {
      if (indexToInsertAt > breakpointIndex) {
        return breakpointIndex;
      }

      return breakpointIndex + 1;
    }));
    this.#setCurrentRecording(
        await this.#storage.updateRecording(recording.storageName, recording.flow),
        {keepBreakpoints: true, updateSession: true});
  }

  async #handleRecordingTitleChanged(event: Components.RecordingView.RecordingTitleChangedEvent): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }

    const flow = {...this.currentRecording.flow, title: event.title};
    this.#setCurrentRecording(await this.#storage.updateRecording(this.currentRecording.storageName, flow));
  }

  async #handleStepRemoved(event: Components.StepView.RemoveStep): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }

    const steps = this.currentRecording.flow.steps;
    const currentIndex = steps.indexOf(event.step);
    steps.splice(currentIndex, 1);
    const flow = {...this.currentRecording.flow, steps};
    Host.userMetrics.recordingEdited(Host.UserMetrics.RecordingEdited.StepRemoved);
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
    this.#setCurrentRecording(
        await this.#storage.updateRecording(this.currentRecording.storageName, flow),
        {keepBreakpoints: true, updateSession: true});
  }

  async #onNetworkConditionsChanged(event: Components.RecordingView.NetworkConditionsChanged): Promise<void> {
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
    if (!event.data) {
      // Delete step if present.
      if (emulateNetworkConditionsIdx !== -1) {
        this.currentRecording.flow.steps.splice(emulateNetworkConditionsIdx, 1);
      }
    } else if (emulateNetworkConditionsIdx === -1) {
      // Insert at the first position.
      this.currentRecording.flow.steps.splice(
          0, 0,
          Models.SchemaUtils.createEmulateNetworkConditionsStep(
              {download: event.data.download, upload: event.data.upload, latency: event.data.latency}));
    } else {
      // Update existing step.
      const step =
          this.currentRecording.flow.steps[emulateNetworkConditionsIdx] as Models.Schema.EmulateNetworkConditionsStep;
      step.download = event.data.download;
      step.upload = event.data.upload;
      step.latency = event.data.latency;
    }
    this.#setCurrentRecording(
        await this.#storage.updateRecording(this.currentRecording.storageName, this.currentRecording.flow));
  }

  async #onTimeoutChanged(event: Components.RecordingView.TimeoutChanged): Promise<void> {
    if (!this.currentRecording) {
      throw new Error('Current recording expected to be defined.');
    }
    this.currentRecording.flow.timeout = event.data;
    this.#setCurrentRecording(
        await this.#storage.updateRecording(this.currentRecording.storageName, this.currentRecording.flow));
  }

  async #onDeleteRecording(event: Event): Promise<void> {
    event.stopPropagation();
    if (event instanceof Components.RecordingListView.DeleteRecordingEvent) {
      await this.#storage.deleteRecording(event.storageName);
      this.#screenshotStorage.deleteScreenshotsForRecording(event.storageName);
      this.requestUpdate();
    } else {
      if (!this.currentRecording) {
        return;
      }
      await this.#storage.deleteRecording(this.currentRecording.storageName);
      this.#screenshotStorage.deleteScreenshotsForRecording(this.currentRecording.storageName);
    }
    if ((await this.#storage.getRecordings()).length) {
      this.#setCurrentPage(Pages.AllRecordingsPage);
    } else {
      this.#setCurrentPage(Pages.StartPage);
    }
    this.#setCurrentRecording(undefined);
    this.#clearError();
  }

  #onCreateNewRecording(event?: Event): void {
    event?.stopPropagation();
    this.#setCurrentPage(Pages.CreateRecordingPage);
    this.#clearError();
  }

  async #onRecordingStarted(event: Components.CreateRecordingView.RecordingStartedEvent): Promise<void> {
    // Recording is not available in device mode.
    await this.#disableDeviceModeIfEnabled();

    // Setting up some variables to notify the user we are initializing a recording.
    this.isToggling = true;
    this.#clearError();

    // -- Recording logic starts here --
    Host.userMetrics.recordingToggled(Host.UserMetrics.RecordingToggled.RecordingStarted);
    this.currentRecordingSession = new Models.RecordingSession.RecordingSession(this.#getMainTarget(), {
      title: event.name,
      selectorAttribute: event.selectorAttribute,
      selectorTypesToRecord: event.selectorTypesToRecord.length ? event.selectorTypesToRecord :
                                                                  Object.values(Models.Schema.SelectorType),
    });
    this.#setCurrentRecording(await this.#storage.saveRecording(this.currentRecordingSession.cloneUserFlow()));

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
      Models.ScreenshotStorage.ScreenshotStorage.instance().storeScreenshotForSection(
          currentRecording.storageName, currentSectionIndex, screenshot);
      previousSectionIndex = currentSectionIndex;
      this.#updateScreenshotsForSections();
    };

    this.currentRecordingSession.addEventListener(
        Models.RecordingSession.Events.RecordingUpdated, async ({data}: {data: Models.Schema.UserFlow}) => {
          if (!this.currentRecording) {
            throw new Error('No current recording found');
          }
          this.#setCurrentRecording(await this.#storage.updateRecording(this.currentRecording.storageName, data));
          const recordingView = this.shadowRoot?.querySelector('devtools-recording-view');
          recordingView?.scrollToBottom();

          await takeScreenshot(this.currentRecording);
        });

    this.currentRecordingSession.addEventListener(
        Models.RecordingSession.Events.RecordingStopped, async ({data}: {data: Models.Schema.UserFlow}) => {
          if (!this.currentRecording) {
            throw new Error('No current recording found');
          }
          Host.userMetrics.keyboardShortcutFired(Actions.RecorderActions.StartRecording);
          this.#setCurrentRecording(await this.#storage.updateRecording(this.currentRecording.storageName, data));
          await this.#onRecordingFinished();
        });

    await this.currentRecordingSession.start();
    // -- Recording logic ends here --

    // Setting up some variables to notify the user we are finished initialization.
    this.isToggling = false;
    this.isRecording = true;
    this.#setCurrentPage(Pages.RecordingPage);

    // Dispatch an event for e2e testing.
    this.dispatchEvent(new Events.RecordingStateChangedEvent((this.currentRecording as StoredRecording).flow));
  }

  async #onRecordingFinished(): Promise<void> {
    if (!this.currentRecording || !this.currentRecordingSession) {
      throw new Error('Recording was never started');
    }

    // Setting up some variables to notify the user we are finalizing a recording.
    this.isToggling = true;
    this.#clearError();

    // -- Recording logic starts here --
    Host.userMetrics.recordingToggled(Host.UserMetrics.RecordingToggled.RecordingFinished);
    await this.currentRecordingSession.stop();
    this.currentRecordingSession = undefined;
    // -- Recording logic ends here --

    // Setting up some variables to notify the user we are finished finalizing.
    this.isToggling = false;
    this.isRecording = false;

    // Dispatch an event for e2e testing.
    this.dispatchEvent(new Events.RecordingStateChangedEvent(this.currentRecording.flow));
  }

  async #onRecordingCancelled(): Promise<void> {
    if (this.previousPage) {
      this.#setCurrentPage(this.previousPage);
    }
  }

  async #onRecordingSelected(event: Event): Promise<void> {
    const storageName = event instanceof Components.RecordingListView.OpenRecordingEvent ||
            event instanceof Components.RecordingListView.PlayRecordingEvent ?
        event.storageName :
        ((event as InputEvent).target as HTMLSelectElement)?.value;
    this.#setCurrentRecording(await this.#storage.getRecording(storageName));
    if (this.currentRecording) {
      this.#setCurrentPage(Pages.RecordingPage);
    } else if (storageName === Pages.StartPage) {
      this.#setCurrentPage(Pages.StartPage);
    } else if (storageName === Pages.AllRecordingsPage) {
      this.#setCurrentPage(Pages.AllRecordingsPage);
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
    const converter = this.#builtInConverters.find(byId) || this.extensionConverters.find(byId);
    if (!converter) {
      throw new Error('No recording selected');
    }
    const [content] = await converter.stringify(this.currentRecording.flow);
    await this.#exportContent(converter.getFilename(this.currentRecording.flow), content);
    const builtInMetric = CONVERTER_ID_TO_METRIC[converter.getId()];
    if (builtInMetric) {
      Host.userMetrics.recordingExported(builtInMetric);
    } else if (converter.getId().startsWith(Converters.ExtensionConverter.EXTENSION_PREFIX)) {
      Host.userMetrics.recordingExported(Host.UserMetrics.RecordingExported.ToExtension);
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
    this.#setCurrentRecording(
        await this.#storage.updateRecording(this.currentRecording.storageName, flow),
        {keepBreakpoints: true, updateSession: true});
    Host.userMetrics.recordingAssertion(Host.UserMetrics.RecordingAssertion.AssertionAdded);
    await this.updateComplete;
    this.renderRoot.querySelector('devtools-recording-view')
        ?.shadowRoot?.querySelector('.section:last-child devtools-step-view:last-of-type')
        ?.shadowRoot?.querySelector<HTMLElement>('.action')
        ?.click();
  }

  #onImportRecording(event: Event): void {
    event.stopPropagation();
    this.#clearError();
    this.#fileSelector = UI.UIUtils.createFileSelectorElement(this.#importFile.bind(this));
    this.#fileSelector.click();
  }

  async #onPlayRecordingByName(event: Components.RecordingListView.PlayRecordingEvent): Promise<void> {
    await this.#onRecordingSelected(event);
    await this.#onPlayRecording(new Components.RecordingView.PlayRecordingEvent(
        {targetPanel: Components.RecordingView.TargetPanel.Default, speed: this.#recorderSettings.speed}));
  }

  #onAddBreakpoint = (event: AddBreakpointEvent): void => {
    this.#stepBreakpointIndexes.add(event.index);
    this.recordingPlayer?.updateBreakpointIndexes(this.#stepBreakpointIndexes);
    this.requestUpdate();
  };

  #onRemoveBreakpoint = (event: RemoveBreakpointEvent): void => {
    this.#stepBreakpointIndexes.delete(event.index);
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
      case Actions.RecorderActions.CreateRecording:
        this.#onCreateNewRecording();
        return;

      case Actions.RecorderActions.StartRecording:
        if (this.currentPage !== Pages.CreateRecordingPage && !this.isRecording) {
          this.#shortcutHelper.handleShortcut(this.#onRecordingStarted.bind(
              this,
              new Components.CreateRecordingView.RecordingStartedEvent(
                  this.#recorderSettings.defaultTitle, this.#recorderSettings.defaultSelectors,
                  this.#recorderSettings.selectorAttribute)));
        } else if (this.currentPage === Pages.CreateRecordingPage) {
          const view = this.renderRoot.querySelector('devtools-create-recording-view');
          if (view) {
            this.#shortcutHelper.handleShortcut(view.startRecording.bind(view));
          }
        } else if (this.isRecording) {
          void this.#onRecordingFinished();
        }
        return;

      case Actions.RecorderActions.ReplayRecording:
        void this.#onPlayRecording(new Components.RecordingView.PlayRecordingEvent(
            {targetPanel: Components.RecordingView.TargetPanel.Default, speed: this.#recorderSettings.speed}));
        return;

      case Actions.RecorderActions.ToggleCodeView: {
        const view = this.renderRoot.querySelector('devtools-recording-view');
        if (view) {
          view.showCodeToggle();
        }
        return;
      }
    }
  }

  isActionPossible(actionId: Actions.RecorderActions): boolean {
    switch (actionId) {
      case Actions.RecorderActions.CreateRecording:
        return !this.isRecording && !this.#replayState.isPlaying;
      case Actions.RecorderActions.StartRecording:
        return !this.#replayState.isPlaying;
      case Actions.RecorderActions.ReplayRecording:
        return (this.currentPage === Pages.RecordingPage && !this.#replayState.isPlaying);
      case Actions.RecorderActions.ToggleCodeView:
        return this.currentPage === Pages.RecordingPage;
    }
  }

  #getShortcutsInfo(): Dialogs.ShortcutDialog.Shortcut[] {
    const getBindingForAction = (action: Actions.RecorderActions): string[] => {
      const shortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(action);

      return shortcuts.map(shortcut => shortcut.title());
    };

    return [
      {
        title: i18nString(UIStrings.startStopRecording),
        bindings: getBindingForAction(Actions.RecorderActions.StartRecording),
      },
      {
        title: i18nString(UIStrings.replayRecording),
        bindings: getBindingForAction(Actions.RecorderActions.ReplayRecording),
      },
      {title: i18nString(UIStrings.copyShortcut), bindings: [`${Host.Platform.isMac() ? '⌘ C' : 'Ctrl+C'}`]},
      {title: i18nString(UIStrings.toggleCode), bindings: getBindingForAction(Actions.RecorderActions.ToggleCodeView)},
    ];
  }

  #renderCurrentPage(): LitHtml.TemplateResult {
    switch (this.currentPage) {
      case Pages.StartPage:
        return this.#renderStartPage();
      case Pages.AllRecordingsPage:
        return this.#renderAllRecordingsPage();
      case Pages.RecordingPage:
        return this.#renderRecordingPage();
      case Pages.CreateRecordingPage:
        return this.#renderCreateRecordingPage();
    }
  }

  #renderAllRecordingsPage(): LitHtml.TemplateResult {
    const recordings = this.#storage.getRecordings();
    // clang-format off
    return html`
      <${Components.RecordingListView.RecordingListView.litTagName}
        .recordings=${recordings.map(recording => ({
          storageName: recording.storageName,
          name: recording.flow.title,
        }))}
        .replayAllowed=${this.#replayAllowed}
        @createrecording=${this.#onCreateNewRecording}
        @deleterecording=${this.#onDeleteRecording}
        @openrecording=${this.#onRecordingSelected}
        @playrecording=${this.#onPlayRecordingByName}
        >
      </${Components.RecordingListView.RecordingListView.litTagName}>
    `;
    // clang-format on
  }

  #renderStartPage(): LitHtml.TemplateResult {
    // clang-format off
    return html`
      <${Components.StartView.StartView.litTagName}
        @createrecording=${this.#onCreateNewRecording}
      ></${Components.StartView.StartView.litTagName}>
    `;
    // clang-format on
  }

  #renderRecordingPage(): LitHtml.TemplateResult {
    // clang-format off
    return html`
      <${Components.RecordingView.RecordingView.litTagName}
        .data=${
          {
            recording: this.currentRecording?.flow,
            replayState: this.#replayState,
            isRecording: this.isRecording,
            recordingTogglingInProgress: this.isToggling,
            currentStep: this.currentStep,
            currentError: this.recordingError,
            sections: this.sections,
            settings: this.settings,
            recorderSettings: this.#recorderSettings,
            lastReplayResult: this.lastReplayResult,
            replayAllowed: this.#replayAllowed,
            breakpointIndexes: this.#stepBreakpointIndexes,
            builtInConverters: this.#builtInConverters,
            extensionConverters: this.extensionConverters,
            replayExtensions: this.replayExtensions,
            extensionDescriptor: this.viewDescriptor,
          } as Components.RecordingView.RecordingViewData
        }
        @networkconditionschanged=${this.#onNetworkConditionsChanged}
        @timeoutchanged=${this.#onTimeoutChanged}
        @requestselectorattribute=${(
          event: Controllers.SelectorPicker.RequestSelectorAttributeEvent,
        ): void => {
          event.send(this.currentRecording?.flow.selectorAttribute);
        }}
        @recordingfinished=${this.#onRecordingFinished}
        @stepchanged=${this.#handleRecordingChanged.bind(this)}
        @recordingtitlechanged=${this.#handleRecordingTitleChanged.bind(this)}
        @addstep=${this.#handleStepAdded.bind(this)}
        @removestep=${this.#handleStepRemoved.bind(this)}
        @addbreakpoint=${this.#onAddBreakpoint}
        @removebreakpoint=${this.#onRemoveBreakpoint}
        @playrecording=${this.#onPlayRecording}
        @abortreplay=${this.#onAbortReplay}
        @recorderextensionviewclosed=${this.#onExtensionViewClosed}
        @addassertion=${this.#handleAddAssertionEvent}
      ></${Components.RecordingView.RecordingView.litTagName}>
    `;
    // clang-format on
  }

  #renderCreateRecordingPage(): LitHtml.TemplateResult {
    // clang-format off
    return html`
      <${Components.CreateRecordingView.CreateRecordingView.litTagName}
        .data=${
          {
            recorderSettings: this.#recorderSettings,
          } as Components.CreateRecordingView.CreateRecordingViewData
        }
        @recordingstarted=${this.#onRecordingStarted}
        @recordingcancelled=${this.#onRecordingCancelled}
      ></${Components.CreateRecordingView.CreateRecordingView.litTagName}>
    `;
    // clang-format on
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

  protected override render(): LitHtml.TemplateResult {
    const recordings = this.#storage.getRecordings();
    const selectValue: string = this.currentRecording ? this.currentRecording.storageName : this.currentPage;
    // clang-format off
    const values = [
      recordings.length === 0
        ? {
            value: Pages.StartPage,
            name: 'No recordings',
            selected: selectValue === Pages.StartPage,
          }
        : {
            value: Pages.AllRecordingsPage,
            name: `${recordings.length} recording(s)`,
            selected: selectValue === Pages.AllRecordingsPage,
          },
      ...recordings.map(recording => ({
        value: recording.storageName,
        name: recording.flow.title,
        selected: selectValue === recording.storageName,
      })),
    ];

    return html`
        <div class="wrapper">
          <div class="header">
            <${Buttons.Button.Button.litTagName}
              @click=${this.#onCreateNewRecording}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'plus',
                  disabled:
                    this.#replayState.isPlaying ||
                    this.isRecording ||
                    this.isToggling,
                  title: Models.Tooltip.getTooltipForActions(
                    i18nString(UIStrings.createRecording),
                    Actions.RecorderActions.CreateRecording,
                  ),
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>
            <div class="separator"></div>
            <select
              .disabled=${
                recordings.length === 0 ||
                this.#replayState.isPlaying ||
                this.isRecording ||
                this.isToggling
              }
              @click=${(e: Event): void => e.stopPropagation()}
              @change=${this.#onRecordingSelected}
            >
              ${LitHtml.Directives.repeat(
                values,
                item => item.value,
                item => {
                  return html`<option .selected=${item.selected} value=${item.value}>${item.name}</option>`;
                },
              )}
            </select>
            <div class="separator"></div>
            <${Buttons.Button.Button.litTagName}
              @click=${this.#onImportRecording}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'import',
                  title: i18nString(UIStrings.importRecording),
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>
            <${Buttons.Button.Button.litTagName}
              id='origin'
              @click=${this.#onExportRecording}
              on-render=${ComponentHelpers.Directives.nodeRenderedCallback(
                node => {
                  this.#exportMenuButton = node as Buttons.Button.Button;
                },
              )}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'download',
                  title: i18nString(UIStrings.exportRecording),
                  disabled: !this.currentRecording,
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>
            <${Menus.Menu.Menu.litTagName}
              @menucloserequest=${this.#onExportMenuClosed}
              @menuitemselected=${this.#onExportOptionSelected}
              .origin=${this.#getExportMenuButton}
              .showDivider=${false}
              .showSelectedItem=${false}
              .showConnector=${false}
              .open=${this.exportMenuExpanded}
            >
              <${Menus.Menu.MenuGroup.litTagName} .name=${i18nString(
      UIStrings.export,
    )}>
                ${LitHtml.Directives.repeat(
                  this.#builtInConverters,
                  converter => {
                    return html`
                    <${
                      Menus.Menu.MenuItem.litTagName
                    } .value=${converter.getId()}>
                      ${converter.getFormatName()}
                    </${Menus.Menu.MenuItem.litTagName}>
                  `;
                  },
                )}
              </${Menus.Menu.MenuGroup.litTagName}>
              <${Menus.Menu.MenuGroup.litTagName} .name=${i18nString(
      UIStrings.exportViaExtensions,
    )}>
                ${LitHtml.Directives.repeat(
                  this.extensionConverters,
                  converter => {
                    return html`
                    <${
                      Menus.Menu.MenuItem.litTagName
                    } .value=${converter.getId()}>
                    ${converter.getFormatName()}
                    </${Menus.Menu.MenuItem.litTagName}>
                  `;
                  },
                )}
                <${
                  Menus.Menu.MenuItem.litTagName
                } .value=${GET_EXTENSIONS_MENU_ITEM}>
                  ${i18nString(UIStrings.getExtensions)}
                </${Menus.Menu.MenuItem.litTagName}>
              </${Menus.Menu.MenuGroup.litTagName}>
            </${Menus.Menu.Menu.litTagName}>
            <${Buttons.Button.Button.litTagName}
              @click=${this.#onDeleteRecording}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'bin',
                  disabled:
                    !this.currentRecording ||
                    this.#replayState.isPlaying ||
                    this.isRecording ||
                    this.isToggling,
                  title: i18nString(UIStrings.deleteRecording),
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>
            <div class="separator"></div>
            <button class="continue-button"
              .disabled=${
                !this.recordingPlayer ||
                !this.#replayState.isPausedOnBreakpoint
              }
              title=${i18nString(UIStrings.continueReplay)}
              @click=${(): void => this.recordingPlayer?.continue()}>
                <${IconButton.Icon.Icon.litTagName}
                  .data=${
                    {
                      iconName: 'resume',
                      color: 'var(--icon-color)',
                    } as IconButton.Icon.IconData
                  }
                ></${IconButton.Icon.Icon.litTagName}>
            </button>
            <${Buttons.Button.Button.litTagName}
              @click=${(): void => this.recordingPlayer?.stepOver()}
              .data=${
                {
                  variant: Buttons.Button.Variant.TOOLBAR,
                  iconName: 'step-over',
                  disabled:
                    !this.recordingPlayer ||
                    !this.#replayState.isPausedOnBreakpoint,
                  title: i18nString(UIStrings.stepOverReplay),
                } as Buttons.Button.ButtonData
              }
            ></${Buttons.Button.Button.litTagName}>
            <div class="feedback">
              <x-link class="x-link" href=${
                Components.StartView.FEEDBACK_URL
              }>${i18nString(UIStrings.sendFeedback)}</x-link>
            </div>
            <div class="separator"></div>
            <${Dialogs.ShortcutDialog.ShortcutDialog.litTagName}
              .data=${
                {
                  shortcuts: this.#getShortcutsInfo(),
                } as Dialogs.ShortcutDialog.ShortcutDialogData
              }
            ></${Dialogs.ShortcutDialog.ShortcutDialog.litTagName}>
          </div>
          ${
            this.importError
              ? html`<div class='error'>Import error: ${
                  this.importError.message
                }</div>`
              : ''
          }
          ${this.#renderCurrentPage()}
        </div>
      `;
    // clang-format on
  }
}
