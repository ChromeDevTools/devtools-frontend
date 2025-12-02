// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../testing/EnvironmentHelpers.js';
import {
  createViewFunctionStub,
  type ViewFunctionStub,
} from '../../../testing/ViewFunctionHelpers.js';
import type * as Extensions from '../extensions/extensions.js';
import * as Models from '../models/models.js';

import * as RecorderComponents from './components.js';

describeWithEnvironment('ReplaySection', () => {
  setupActionRegistry();

  let settings: Models.RecorderSettings.RecorderSettings;
  const views: RecorderComponents.ReplaySection.ReplaySection[] = [];

  afterEach(() => {
    settings.speed = Models.RecordingPlayer.PlayRecordingSpeed.NORMAL;
    for (const view of views) {
      view.willHide();
    }
  });

  async function createReplaySection(
      speed: Models.RecordingPlayer.PlayRecordingSpeed = Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
      ):
      Promise<[
        ViewFunctionStub<typeof RecorderComponents.ReplaySection.ReplaySection>,
        RecorderComponents.ReplaySection.ReplaySection,
      ]> {
    settings = new Models.RecorderSettings.RecorderSettings();
    settings.speed = speed;
    const view = createViewFunctionStub(RecorderComponents.ReplaySection.ReplaySection);
    const component = new RecorderComponents.ReplaySection.ReplaySection(undefined, view);
    component.settings = settings;
    component.replayExtensions = [];
    component.onStartReplay = () => {};
    component.wasShown();
    views.push(component);

    return [view, component];
  }

  it('should change the button value when another option is selected in select menu', async () => {
    const [view] = await createReplaySection();
    assert.strictEqual(
        view.input.selectedItem.value,
        Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
    );

    view.input.onItemSelected(Models.RecordingPlayer.PlayRecordingSpeed.SLOW);
    assert.strictEqual(
        view.input.selectedItem.value,
        Models.RecordingPlayer.PlayRecordingSpeed.SLOW,
    );
  });

  it('should call onStartReplay on selectbuttonclick event', async () => {
    const [view, component] = await createReplaySection();
    const onStartReplay = sinon.stub();
    component.settings = settings;
    component.replayExtensions = [];
    component.onStartReplay = onStartReplay;

    view.input.onItemSelected(Models.RecordingPlayer.PlayRecordingSpeed.SLOW);
    view.input.onButtonClick();

    sinon.assert.calledWith(onStartReplay, Models.RecordingPlayer.PlayRecordingSpeed.SLOW);
  });

  it('should save the changed button when option is selected in select menu', async () => {
    const [view] = await createReplaySection();
    view.input.onItemSelected(Models.RecordingPlayer.PlayRecordingSpeed.SLOW);

    assert.strictEqual(
        settings.speed,
        Models.RecordingPlayer.PlayRecordingSpeed.SLOW,
    );
  });

  it('should load the saved button on initial render', async () => {
    const [view] = await createReplaySection(Models.RecordingPlayer.PlayRecordingSpeed.SLOW);

    assert.strictEqual(
        view.input.selectedItem.value,
        Models.RecordingPlayer.PlayRecordingSpeed.SLOW,
    );
  });

  it('should call onStartReplay with extension when extension is selected', async () => {
    const [view, component] = await createReplaySection();
    const onStartReplay = sinon.stub();
    const extension = {
      getName: () => 'Test Extension',
      getDescriptor: () => ({}),
      install: () => {},
      uninstall: () => {},
    } as unknown as Extensions.ExtensionManager.Extension;
    component.settings = settings;
    component.replayExtensions = [extension];
    component.onStartReplay = onStartReplay;

    view.input.onItemSelected('extension0');
    view.input.onButtonClick();

    sinon.assert.calledWith(
        onStartReplay,
        Models.RecordingPlayer.PlayRecordingSpeed.NORMAL,
        extension,
    );
  });
});
