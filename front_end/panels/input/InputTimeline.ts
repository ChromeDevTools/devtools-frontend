// Copyright (c) 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Timeline from '../timeline/timeline.js';
import inputTimelineStyles from './inputTimeline.css.js';

import {InputModel} from './InputModel.js';

const UIStrings = {
  /**
  *@description Text to clear everything
  */
  clearAll: 'Clear all',
  /**
  *@description Tooltip text that appears when hovering over the largeicon load button
  */
  loadProfile: 'Load profile…',
  /**
  *@description Tooltip text that appears when hovering over the largeicon download button
  */
  saveProfile: 'Save profile…',
};
const str_ = i18n.i18n.registerUIStrings('panels/input//InputTimeline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let inputTimelineInstance: InputTimeline;
export class InputTimeline extends UI.Widget.VBox implements Timeline.TimelineLoader.Client {
  private tracingClient: TracingClient|null;
  private tracingModel: SDK.TracingModel.TracingModel|null;
  private inputModel: InputModel|null;
  private state: State;
  private readonly toggleRecordAction: UI.ActionRegistration.Action;
  private readonly startReplayAction: UI.ActionRegistration.Action;
  private readonly togglePauseAction: UI.ActionRegistration.Action;
  private readonly panelToolbar: UI.Toolbar.Toolbar;
  private readonly clearButton: UI.Toolbar.ToolbarButton;
  private readonly loadButton: UI.Toolbar.ToolbarButton;
  private readonly saveButton: UI.Toolbar.ToolbarButton;
  private fileSelectorElement?: HTMLInputElement;
  private loader?: Timeline.TimelineLoader.TimelineLoader;

  constructor() {
    super(true);
    this.element.classList.add('inputs-timeline');

    this.tracingClient = null;
    this.tracingModel = null;
    this.inputModel = null;

    this.state = State.Idle;
    this.toggleRecordAction =
        UI.ActionRegistry.ActionRegistry.instance().action('input.toggle-recording') as UI.ActionRegistration.Action;
    this.startReplayAction =
        UI.ActionRegistry.ActionRegistry.instance().action('input.start-replaying') as UI.ActionRegistration.Action;
    this.togglePauseAction =
        UI.ActionRegistry.ActionRegistry.instance().action('input.toggle-pause') as UI.ActionRegistration.Action;

    const toolbarContainer = this.contentElement.createChild('div', 'input-timeline-toolbar-container');
    this.panelToolbar = new UI.Toolbar.Toolbar('input-timeline-toolbar', toolbarContainer);

    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.startReplayAction));
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.togglePauseAction));

    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'largeicon-clear');
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.reset.bind(this));
    this.panelToolbar.appendToolbarItem(this.clearButton);

    this.panelToolbar.appendSeparator();

    // Load / Save
    this.loadButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.loadProfile), 'largeicon-load');
    this.loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this.selectFileToLoad());
    this.saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.saveProfile), 'largeicon-download');
    this.saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      void this.saveToFile();
    });
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.loadButton);
    this.panelToolbar.appendToolbarItem(this.saveButton);
    this.panelToolbar.appendSeparator();
    this.createFileSelector();

    this.updateControls();
  }

  static instance(opts: {forceNew: boolean} = {forceNew: false}): InputTimeline {
    const {forceNew} = opts;
    if (!inputTimelineInstance || forceNew) {
      inputTimelineInstance = new InputTimeline();
    }

    return inputTimelineInstance;
  }

  private reset(): void {
    this.tracingClient = null;
    this.tracingModel = null;
    this.inputModel = null;
    this.setState(State.Idle);
  }

  private createFileSelector(): void {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.remove();
    }
    this.fileSelectorElement = UI.UIUtils.createFileSelectorElement(this.loadFromFile.bind(this));
    this.element.appendChild(this.fileSelectorElement);
  }

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([inputTimelineStyles]);
  }

  willHide(): void {
  }

  private setState(state: State): void {
    this.state = state;
    this.updateControls();
  }

  private isAvailableState(): boolean {
    return this.state === State.Idle || this.state === State.ReplayPaused;
  }

  private updateControls(): void {
    this.toggleRecordAction.setToggled(this.state === State.Recording);
    this.toggleRecordAction.setEnabled(this.isAvailableState() || this.state === State.Recording);
    this.startReplayAction.setEnabled(this.isAvailableState() && Boolean(this.tracingModel));
    this.togglePauseAction.setEnabled(this.state === State.Replaying || this.state === State.ReplayPaused);
    this.togglePauseAction.setToggled(this.state === State.ReplayPaused);
    this.clearButton.setEnabled(this.isAvailableState());
    this.loadButton.setEnabled(this.isAvailableState());
    this.saveButton.setEnabled(this.isAvailableState() && Boolean(this.tracingModel));
  }

  toggleRecording(): void {
    switch (this.state) {
      case State.Recording: {
        void this.stopRecording();
        break;
      }
      case State.Idle: {
        void this.startRecording();
        break;
      }
    }
  }

  startReplay(): void {
    void this.replayEvents();
  }

  toggleReplayPause(): void {
    switch (this.state) {
      case State.Replaying: {
        this.pauseReplay();
        break;
      }
      case State.ReplayPaused: {
        this.resumeReplay();
        break;
      }
    }
  }

  /**
   * Saves all current events in a file (JSON format).
   */
  private async saveToFile(): Promise<void> {
    console.assert(this.state === State.Idle);
    if (!this.tracingModel) {
      return;
    }

    const fileName = `InputProfile-${Platform.DateUtilities.toISO8601Compact(new Date())}.json` as
        Platform.DevToolsPath.RawPathString;
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    const backingStorage = this.tracingModel.backingStorage() as Bindings.TempFile.TempFileBackingStorage;
    await backingStorage.writeToStream(stream);
    void stream.close();
  }

  private selectFileToLoad(): void {
    if (this.fileSelectorElement) {
      this.fileSelectorElement.click();
    }
  }

  private loadFromFile(file: File): void {
    console.assert(this.isAvailableState());

    this.setState(State.Loading);
    this.loader = Timeline.TimelineLoader.TimelineLoader.loadFromFile(file, this);

    this.createFileSelector();
  }

  private async startRecording(): Promise<void> {
    this.setState(State.StartPending);
    this.tracingClient =
        new TracingClient(SDK.TargetManager.TargetManager.instance().mainTarget() as SDK.Target.Target, this);

    const response = await this.tracingClient.startRecording();
    if (!response || response.getError()) {
      this.recordingFailed();
    } else {
      this.setState(State.Recording);
    }
  }

  private async stopRecording(): Promise<void> {
    if (!this.tracingClient) {
      return;
    }
    this.setState(State.StopPending);
    await this.tracingClient.stopRecording();
    this.tracingClient = null;
  }

  private async replayEvents(): Promise<void> {
    if (!this.inputModel) {
      return;
    }
    this.setState(State.Replaying);
    await this.inputModel.startReplay(this.replayStopped.bind(this));
  }

  private pauseReplay(): void {
    if (!this.inputModel) {
      return;
    }
    this.inputModel.pause();
    this.setState(State.ReplayPaused);
  }

  private resumeReplay(): void {
    if (!this.inputModel) {
      return;
    }
    this.inputModel.resume();
    this.setState(State.Replaying);
  }

  loadingStarted(): void {
  }

  loadingProgress(_progress?: number): void {
  }

  processingStarted(): void {
  }

  loadingComplete(tracingModel: SDK.TracingModel.TracingModel|null): void {
    if (!tracingModel) {
      this.reset();
      return;
    }
    this.inputModel = new InputModel(SDK.TargetManager.TargetManager.instance().mainTarget() as SDK.Target.Target);
    this.tracingModel = tracingModel;
    this.inputModel.setEvents(tracingModel);

    this.setState(State.Idle);
  }

  private recordingFailed(): void {
    this.tracingClient = null;
    this.setState(State.Idle);
  }

  replayStopped(): void {
    this.setState(State.Idle);
  }
}

export const enum State {
  Idle = 'Idle',
  StartPending = 'StartPending',
  Recording = 'Recording',
  StopPending = 'StopPending',
  Replaying = 'Replaying',
  ReplayPaused = 'ReplayPaused',
  Loading = 'Loading',
}

let actionDelegateInstance: ActionDelegate;
export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const inputViewId = 'Inputs';
    void UI.ViewManager.ViewManager.instance()
        .showView(inputViewId)
        .then(() => (UI.ViewManager.ViewManager.instance().view(inputViewId) as UI.View.View).widget())
        .then(widget => this.innerHandleAction(widget as InputTimeline, actionId));

    return true;
  }

  private innerHandleAction(inputTimeline: InputTimeline, actionId: string): void {
    switch (actionId) {
      case 'input.toggle-recording':
        inputTimeline.toggleRecording();
        break;
      case 'input.start-replaying':
        inputTimeline.startReplay();
        break;
      case 'input.toggle-pause':
        inputTimeline.toggleReplayPause();
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
}

export class TracingClient implements SDK.TracingManager.TracingManagerClient {
  private readonly target: SDK.Target.Target;
  private tracingManager: SDK.TracingManager.TracingManager|null;
  private readonly client: InputTimeline;
  private readonly tracingModel: SDK.TracingModel.TracingModel;
  private tracingCompleteCallback: (() => void)|null;
  constructor(target: SDK.Target.Target, client: InputTimeline) {
    this.target = target;
    this.tracingManager = target.model(SDK.TracingManager.TracingManager);
    this.client = client;

    const backingStorage = new Bindings.TempFile.TempFileBackingStorage();
    this.tracingModel = new SDK.TracingModel.TracingModel(backingStorage);

    this.tracingCompleteCallback = null;
  }

  async startRecording(): Promise<Protocol.ProtocolResponseWithError|undefined> {
    if (!this.tracingManager) {
      return;
    }

    const categoriesArray = ['devtools.timeline', 'disabled-by-default-devtools.timeline.inputs'];
    const categories = categoriesArray.join(',');

    const response = await this.tracingManager.start(this, categories, '');
    if (response.getError()) {
      await this.waitForTracingToStop(false);
    }
    return response;
  }

  async stopRecording(): Promise<void> {
    if (this.tracingManager) {
      this.tracingManager.stop();
    }

    await this.waitForTracingToStop(true);
    await SDK.TargetManager.TargetManager.instance().resumeAllTargets();
    this.tracingModel.tracingComplete();
    this.client.loadingComplete(this.tracingModel);
  }
  traceEventsCollected(events: SDK.TracingManager.EventPayload[]): void {
    this.tracingModel.addEvents(events);
  }

  tracingComplete(): void {
    if (this.tracingCompleteCallback) {
      this.tracingCompleteCallback();
    }
    this.tracingCompleteCallback = null;
  }

  tracingBufferUsage(_usage: number): void {
  }

  eventsRetrievalProgress(_progress: number): void {
  }

  private waitForTracingToStop(awaitTracingCompleteCallback: boolean): Promise<void> {
    return new Promise(resolve => {
      if (this.tracingManager && awaitTracingCompleteCallback) {
        this.tracingCompleteCallback = resolve;
      } else {
        resolve();
      }
    });
  }
}
