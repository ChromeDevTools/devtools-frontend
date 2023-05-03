// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';

import {type UserFlow} from './Schema.js';

let instance: RecordingStorage|null = null;

interface IdGenerator {
  next(): string;
}

class UUIDGenerator implements IdGenerator {
  next(): string {
    // @ts-ignore
    return crypto.randomUUID();
  }
}

export class RecordingStorage {
  #recordingsSetting: Common.Settings.Setting<StoredRecording[]>;
  #mutex = new Common.Mutex.Mutex();
  #idGenerator: IdGenerator = new UUIDGenerator();

  constructor() {
    this.#recordingsSetting = Common.Settings.Settings.instance().createSetting(
        'recorder_recordings_ng',
        [],
    );
  }

  clearForTest(): void {
    this.#recordingsSetting.set([]);
    this.#idGenerator = new UUIDGenerator();
  }

  setIdGeneratorForTest(idGenerator: IdGenerator): void {
    this.#idGenerator = idGenerator;
  }

  async saveRecording(flow: UserFlow): Promise<StoredRecording> {
    const release = await this.#mutex.acquire();
    try {
      const recordings = await this.#recordingsSetting.forceGet();
      const storageName = this.#idGenerator.next();
      const recording = {storageName, flow};
      recordings.push(recording);
      this.#recordingsSetting.set(recordings);
      return recording;
    } finally {
      release();
    }
  }

  async updateRecording(
      storageName: string,
      flow: UserFlow,
      ): Promise<StoredRecording> {
    const release = await this.#mutex.acquire();
    try {
      const recordings = await this.#recordingsSetting.forceGet();
      const recording = recordings.find(
          recording => recording.storageName === storageName,
      );
      if (!recording) {
        throw new Error('No recording is found during updateRecording');
      }
      recording.flow = flow;
      this.#recordingsSetting.set(recordings);
      return recording;
    } finally {
      release();
    }
  }

  async deleteRecording(storageName: string): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const recordings = await this.#recordingsSetting.forceGet();
      this.#recordingsSetting.set(
          recordings.filter(recording => recording.storageName !== storageName),
      );
    } finally {
      release();
    }
  }

  getRecording(storageName: string): StoredRecording|undefined {
    const recordings = this.#recordingsSetting.get();
    return recordings.find(
        recording => recording.storageName === storageName,
    );
  }

  getRecordings(): StoredRecording[] {
    return this.#recordingsSetting.get();
  }

  static instance(): RecordingStorage {
    if (!instance) {
      instance = new RecordingStorage();
    }
    return instance;
  }
}

export interface StoredRecording {
  storageName: string;
  flow: UserFlow;
}
