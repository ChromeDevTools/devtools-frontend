// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';

import * as Recorder from './models.js';

let instance: Recorder.ScreenshotStorage.ScreenshotStorage;

describeWithEnvironment('ScreenshotStorage', () => {
  beforeEach(() => {
    instance = Recorder.ScreenshotStorage.ScreenshotStorage.instance();
    instance.clear();
  });

  it('should return null if no screenshot has been stored for the given index', () => {
    const imageData = instance.getScreenshotForSection('recording-1', 1);
    assert.isNull(imageData);
  });

  it('should return the stored image data when a screenshot has been stored for the given index', () => {
    const imageData = 'data:image/jpeg;base64,...' as Recorder.ScreenshotStorage.Screenshot;
    instance.storeScreenshotForSection('recording-1', 1, imageData);
    const retrievedImageData = instance.getScreenshotForSection(
        'recording-1',
        1,
    );
    assert.strictEqual(retrievedImageData, imageData);
  });

  it('should load previous screenshots from settings', () => {
    const imageData = 'data:image/jpeg;base64,...' as Recorder.ScreenshotStorage.Screenshot;
    const setting = Common.Settings.Settings.instance().createSetting<Recorder.ScreenshotStorage.ScreenshotMetaData[]>(
        'recorder-screenshots', []);
    setting.set([{recordingName: 'recording-1', index: 1, data: imageData}]);

    const screenshotStorage = Recorder.ScreenshotStorage.ScreenshotStorage.instance({forceNew: true});
    const retrievedImageData = screenshotStorage.getScreenshotForSection(
        'recording-1',
        1,
    );
    assert.strictEqual(retrievedImageData, imageData);
  });

  it('should sync screenshots to settings', () => {
    const imageData = 'data:image/jpeg;base64,...' as Recorder.ScreenshotStorage.Screenshot;
    instance.storeScreenshotForSection('recording-1', 1, imageData);

    const setting = Common.Settings.Settings.instance().createSetting<Recorder.ScreenshotStorage.ScreenshotMetaData[]>(
        'recorder-screenshots', []);
    const value = setting.get();
    assert.strictEqual(value.length, 1);
    assert.strictEqual(value[0].index, 1);
    assert.strictEqual(value[0].data, imageData);
  });

  it('should limit the amount of stored screenshots', () => {
    const screenshotStorage = Recorder.ScreenshotStorage.ScreenshotStorage.instance({
      forceNew: true,
      maxStorageSize: 2,
    });

    screenshotStorage.storeScreenshotForSection(
        'recording-1',
        1,
        '1' as Recorder.ScreenshotStorage.Screenshot,
    );
    screenshotStorage.storeScreenshotForSection(
        'recording-1',
        2,
        '2' as Recorder.ScreenshotStorage.Screenshot,
    );
    screenshotStorage.storeScreenshotForSection(
        'recording-1',
        3,
        '3' as Recorder.ScreenshotStorage.Screenshot,
    );

    const imageData1 = screenshotStorage.getScreenshotForSection(
        'recording-1',
        1,
    );
    const imageData2 = screenshotStorage.getScreenshotForSection(
        'recording-1',
        2,
    );
    const imageData3 = screenshotStorage.getScreenshotForSection(
        'recording-1',
        3,
    );

    assert.isNull(imageData1);
    assert.isNotNull(imageData2);
    assert.isNotNull(imageData3);
  });

  it('should drop the oldest screenshots first', () => {
    const screenshotStorage = Recorder.ScreenshotStorage.ScreenshotStorage.instance({
      forceNew: true,
      maxStorageSize: 2,
    });

    screenshotStorage.storeScreenshotForSection(
        'recording-1',
        1,
        '1' as Recorder.ScreenshotStorage.Screenshot,
    );
    screenshotStorage.storeScreenshotForSection(
        'recording-1',
        2,
        '2' as Recorder.ScreenshotStorage.Screenshot,
    );
    screenshotStorage.getScreenshotForSection('recording-1', 1);
    screenshotStorage.storeScreenshotForSection(
        'recording-1',
        3,
        '3' as Recorder.ScreenshotStorage.Screenshot,
    );

    const imageData1 = screenshotStorage.getScreenshotForSection(
        'recording-1',
        1,
    );
    const imageData2 = screenshotStorage.getScreenshotForSection(
        'recording-1',
        2,
    );
    const imageData3 = screenshotStorage.getScreenshotForSection(
        'recording-1',
        3,
    );

    assert.isNotNull(imageData1);
    assert.isNull(imageData2);
    assert.isNotNull(imageData3);
  });

  it('should namespace the screenshots by recording name', () => {
    const imageData = 'data:image/jpeg;base64,...' as Recorder.ScreenshotStorage.Screenshot;

    instance.storeScreenshotForSection('recording-1', 1, imageData);
    const storedImageData = instance.getScreenshotForSection('recording-2', 1);

    assert.isNull(storedImageData);
  });

  it('should delete screenshots by recording name', () => {
    const imageData = 'data:image/jpeg;base64,...' as Recorder.ScreenshotStorage.Screenshot;

    instance.storeScreenshotForSection('recording-1', 1, imageData);
    const storedImageData = instance.getScreenshotForSection('recording-2', 1);

    assert.isNull(storedImageData);
  });
});
