// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as RecorderComponents from '../../../../../../front_end/panels/recorder/components/components.js';
import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

import {renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('ReplayButton', () => {
  setupActionRegistry();

  let settings: Models.RecorderSettings.RecorderSettings;
  async function createReplayButton() {
    settings = new Models.RecorderSettings.RecorderSettings();
    const component = new RecorderComponents.ReplayButton.ReplayButton();
    component.data = {settings, replayExtensions: []};
    renderElementIntoDOM(component);
    await coordinator.done();

    return component;
  }

  afterEach(() => {
    settings.speed = Models.RecordingPlayer.PlayRecordingSpeed.Normal;
  });

  it('should change the button value when another option is selected in select menu', async () => {
    const component = await createReplayButton();
    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );
    assert.strictEqual(
        selectButton?.value,
        Models.RecordingPlayer.PlayRecordingSpeed.Normal,
    );

    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectButtonClickEvent(
            Models.RecordingPlayer.PlayRecordingSpeed.Slow,
            ),
    );
    await coordinator.done();
    assert.strictEqual(
        selectButton?.value,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });

  it('should emit startreplayevent on selectbuttonclick event', async () => {
    const component = await createReplayButton();
    const onceClicked = new Promise<RecorderComponents.ReplayButton.StartReplayEvent>(
        resolve => {
          component.addEventListener('startreplay', resolve, {once: true});
        },
    );

    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );
    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectButtonClickEvent(
            Models.RecordingPlayer.PlayRecordingSpeed.Slow,
            ),
    );

    const event = await onceClicked;
    assert.deepEqual(
        event.speed,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });

  it('should save the changed button when option is selected in select menu', async () => {
    const component = await createReplayButton();
    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );

    selectButton?.dispatchEvent(
        new RecorderComponents.SelectButton.SelectButtonClickEvent(
            Models.RecordingPlayer.PlayRecordingSpeed.Slow,
            ),
    );

    assert.strictEqual(
        settings.speed,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });

  it('should load the saved button on initial render', async () => {
    settings.speed = Models.RecordingPlayer.PlayRecordingSpeed.Slow;

    const component = await createReplayButton();

    const selectButton = component.shadowRoot?.querySelector(
        'devtools-select-button',
    );
    assert.strictEqual(
        selectButton?.value,
        Models.RecordingPlayer.PlayRecordingSpeed.Slow,
    );
  });
});
