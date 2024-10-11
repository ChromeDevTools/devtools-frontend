// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as RecordingClient from './RecordingClient.js';
import * as SelectorPicker from './SelectorPicker.js';
import type {AccessibilityBindings} from './selectors/ARIASelector.js';
import type * as Step from './Step.js';

declare global {
  interface Window {
    stopShortcut(payload: string): void;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    DevToolsRecorder: DevToolsRecorder;
  }
}

class DevToolsRecorder {
  #recordingClient?: RecordingClient.RecordingClient;
  startRecording(
      bindings: AccessibilityBindings,
      options?: RecordingClient.RecordingClientOptions,
      ): void {
    if (this.#recordingClient) {
      throw new Error('Recording client already started.');
    }
    if (this.#selectorPicker) {
      throw new Error('Selector picker is active.');
    }
    this.#recordingClient = new RecordingClient.RecordingClient(
        bindings,
        options,
    );
    this.#recordingClient.start();
  }
  stopRecording(): void {
    if (!this.#recordingClient) {
      throw new Error('Recording client was not started.');
    }
    this.#recordingClient.stop();
    this.#recordingClient = undefined;
  }

  get recordingClientForTesting(): RecordingClient.RecordingClient {
    if (!this.#recordingClient) {
      throw new Error('Recording client was not started.');
    }
    return this.#recordingClient;
  }

  #selectorPicker?: SelectorPicker.SelectorPicker;
  startSelectorPicker(
      bindings: AccessibilityBindings,
      customAttribute?: string,
      debug?: boolean,
      ): void {
    if (this.#selectorPicker) {
      throw new Error('Selector picker already started.');
    }
    if (this.#recordingClient) {
      this.#recordingClient.stop();
    }
    this.#selectorPicker = new SelectorPicker.SelectorPicker(
        bindings,
        customAttribute,
        debug,
    );
    this.#selectorPicker.start();
  }
  stopSelectorPicker(): void {
    if (!this.#selectorPicker) {
      throw new Error('Selector picker was not started.');
    }
    this.#selectorPicker.stop();
    this.#selectorPicker = undefined;
    if (this.#recordingClient) {
      this.#recordingClient.start();
    }
  }
}

if (!window.DevToolsRecorder) {
  window.DevToolsRecorder = new DevToolsRecorder();
}

export {
  type Step,
  type RecordingClient,
  type SelectorPicker,
  type DevToolsRecorder,
};
