// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Recorder from '../../models/recorder/recorder.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Components from './components/components.js';

// const UIStrings = {};
// const str_ = i18n.i18n.registerUIStrings('panels/recorder/RecorderPanel.ts', UIStrings);
// const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let recorderPanelInstance: RecorderPanel;

export class RecorderPanel extends UI.Panel.Panel {
  private recording: Recorder.Steps.UserFlow|null;
  private isPlaying: boolean = false;
  private isRecording: boolean = false;
  private currentStep?: Recorder.Steps.Step;
  private currentError?: Error;

  constructor() {
    super('recorder');
    this.registerRequiredCSS('panels/recorder/recorderPanel.css');

    const mainContainer = new UI.Widget.VBox();
    mainContainer.show(this.element);

    const target = SDK.TargetManager.TargetManager.instance().mainTarget() as SDK.Target.Target;

    const recorderModel = target.model(Recorder.RecorderModel.RecorderModel);
    if (!recorderModel) {
      throw new Error('Could not find recorder model.');
    }

    recorderModel.getAvailableRecordings();

    this.recording = {
      title: '',
      sections: [],
    } as Recorder.Steps.UserFlow;

    const recordingView = new Components.RecordingView.RecordingView();
    recordingView.style.flex = '1';
    recordingView.addEventListener('recordingtoggled', async (e: Event) => {
      const event = e as Components.RecordingView.RecordingToggledEvent;
      this.isRecording = event.data;
      recordingView.data = {
        recording: this.recording as Recorder.Steps.UserFlow,
        isRecording: this.isRecording,
        isPlaying: this.isPlaying,
        currentStep: this.currentStep,
        currentError: this.currentError,
      };

      const currentSession = await recorderModel.toggleRecording();

      this.recording = (currentSession ? currentSession.getUserFlow() : this.recording) as Recorder.Steps.UserFlow;
      recordingView.data = {
        recording: this.recording,
        isRecording: this.isRecording,
        isPlaying: this.isPlaying,
        currentStep: this.currentStep,
        currentError: this.currentError,
      };

      if (currentSession) {
        currentSession.addEventListener('recording-updated', async ({data}: {data: Recorder.Steps.UserFlow}) => {
          this.recording = data;
          recordingView.data = {
            recording: this.recording,
            isRecording: this.isRecording,
            isPlaying: this.isPlaying,
            currentStep: this.currentStep,
            currentError: this.currentError,
          };
          recordingView.scrollToBottom();
        });
      }
    });

    recordingView.addEventListener('playrecording', async () => {
      if (!this.recording) {
        return;
      }
      this.isPlaying = true;
      this.currentStep = undefined;
      this.currentError = undefined;
      recordingView.data = {
        recording: this.recording,
        isRecording: this.isRecording,
        isPlaying: this.isPlaying,
        currentStep: this.currentStep,
        currentError: this.currentError,
      };

      const player = recorderModel.prepareForReplaying(this.recording);

      player.addEventListener(Recorder.RecordingPlayer.Events.Step, ({data: step}) => {
        this.currentStep = step;
        recordingView.data = {
          recording: this.recording as Recorder.Steps.UserFlow,
          isRecording: this.isRecording,
          isPlaying: this.isPlaying,
          currentStep: this.currentStep,
          currentError: this.currentError,
        };
      });

      player.addEventListener(Recorder.RecordingPlayer.Events.Error, ({data: error}) => {
        this.currentError = error;
        recordingView.data = {
          recording: this.recording as Recorder.Steps.UserFlow,
          isRecording: this.isRecording,
          isPlaying: this.isPlaying,
          currentStep: this.currentStep,
          currentError: this.currentError,
        };
      });

      player.addEventListener(Recorder.RecordingPlayer.Events.Done, () => {
        this.isPlaying = false;
        recordingView.data = {
          recording: this.recording as Recorder.Steps.UserFlow,
          isRecording: this.isRecording,
          isPlaying: this.isPlaying,
          currentStep: this.currentStep,
          currentError: this.currentError,
        };
      });
      await player.play();
    });

    recordingView.data = {
      recording: this.recording as Recorder.Steps.UserFlow,
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
      currentStep: this.currentStep,
      currentError: this.currentError,
    };

    mainContainer.element.appendChild(recordingView as Node);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): RecorderPanel {
    const {forceNew} = opts;
    if (!recorderPanelInstance || forceNew) {
      recorderPanelInstance = new RecorderPanel();
    }

    return recorderPanelInstance;
  }
}
