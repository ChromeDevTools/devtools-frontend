// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';

export type Screenshot = string&{_brand: 'ImageData'};

export interface ScreenshotMetaData {
  recordingName: string;
  index: number;
  data: Screenshot;
}

let instance: ScreenshotStorage|null = null;

// Default size of storage
const DEFAULT_MAX_STORAGE_SIZE = 50 * 1024 * 1024;

/**
 * This class stores the screenshots taken for a specific recording
 * in a settings object. The total storage size is limited to 50 MB
 * by default and the least recently accessed screenshots will be
 * deleted first.
 */
export class ScreenshotStorage {
  #screenshotSettings: Common.Settings.Setting<ScreenshotMetaData[]>;
  #screenshots: Map<string, ScreenshotMetaData>;
  #maxStorageSize: number;

  constructor(maxStorageSize = DEFAULT_MAX_STORAGE_SIZE) {
    this.#screenshotSettings = Common.Settings.Settings.instance().createSetting(
        'recorder_screenshots',
        [],
    );
    this.#screenshots = this.#loadFromSettings();
    this.#maxStorageSize = maxStorageSize;
  }

  clear(): void {
    this.#screenshotSettings.set([]);
    this.#screenshots = new Map();
  }

  getScreenshotForSection(
      recordingName: string,
      index: number,
      ): Screenshot|null {
    const screenshot = this.#screenshots.get(
        this.#calculateKey(recordingName, index),
    );
    if (!screenshot) {
      return null;
    }

    this.#syncWithSettings(screenshot);
    return screenshot.data;
  }

  storeScreenshotForSection(
      recordingName: string,
      index: number,
      data: Screenshot,
      ): void {
    const screenshot = {recordingName, index, data};
    this.#screenshots.set(this.#calculateKey(recordingName, index), screenshot);
    this.#syncWithSettings(screenshot);
  }

  deleteScreenshotsForRecording(recordingName: string): void {
    for (const [key, entry] of this.#screenshots) {
      if (entry.recordingName === recordingName) {
        this.#screenshots.delete(key);
      }
    }

    this.#syncWithSettings();
  }

  #calculateKey(recordingName: string, index: number): string {
    return `${recordingName}:${index}`;
  }

  #loadFromSettings(): Map<string, ScreenshotMetaData> {
    const screenshots = new Map<string, ScreenshotMetaData>();
    const data = this.#screenshotSettings.get();
    for (const item of data) {
      screenshots.set(this.#calculateKey(item.recordingName, item.index), item);
    }

    return screenshots;
  }

  #syncWithSettings(modifiedScreenshot?: ScreenshotMetaData): void {
    if (modifiedScreenshot) {
      const key = this.#calculateKey(
          modifiedScreenshot.recordingName,
          modifiedScreenshot.index,
      );

      // Make sure that the modified screenshot is moved to the end of the map
      // as the JS Map remembers the original insertion order of the keys.
      this.#screenshots.delete(key);
      this.#screenshots.set(key, modifiedScreenshot);
    }

    const screenshots = [];
    let currentStorageSize = 0;

    // Take screenshots from the end of the list until the size constraint is met.
    for (const [key, screenshot] of Array
             .from(
                 this.#screenshots.entries(),
                 )
             .reverse()) {
      if (currentStorageSize < this.#maxStorageSize) {
        currentStorageSize += screenshot.data.length;
        screenshots.push(screenshot);
      } else {
        // Delete all screenshots that exceed the storage limit.
        this.#screenshots.delete(key);
      }
    }

    this.#screenshotSettings.set(screenshots.reverse());
  }

  static instance(
      opts: {
        forceNew?: boolean|null,
        maxStorageSize?: number,
      } = {forceNew: null, maxStorageSize: DEFAULT_MAX_STORAGE_SIZE},
      ): ScreenshotStorage {
    const {forceNew, maxStorageSize} = opts;
    if (!instance || forceNew) {
      instance = new ScreenshotStorage(maxStorageSize);
    }
    return instance;
  }
}
