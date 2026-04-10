// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../../testing/EnvironmentHelpers.js';
import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as AiAssistance from '../ai_assistance.js';

describe('OptInChangeDialog', () => {
  beforeEach(async () => {
    await initializeGlobalVars();
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('renders correctly', async () => {
    const component = new AiAssistance.OptInChangeDialog.OptInChangeDialog({
      onGotIt: () => {},
      onManageSettings: () => {},
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const h1 = querySelectorErrorOnMissing<HTMLElement>(component.element, 'h1');
    assert.strictEqual(h1.textContent?.trim(), 'AI assistance just got better');

    const items = component.element.querySelectorAll('main .item');
    assert.lengthOf(items, 3);

    const buttons = component.element.querySelectorAll('footer devtools-button');
    assert.lengthOf(buttons, 2);
    assert.strictEqual(buttons[0].textContent?.trim(), 'Manage in settings');
    assert.strictEqual(buttons[1].textContent?.trim(), 'Got it');
  });

  it('calls onGotIt when "Got it" button is clicked', async () => {
    const onGotIt = sinon.stub();
    const component = new AiAssistance.OptInChangeDialog.OptInChangeDialog({
      onGotIt,
      onManageSettings: () => {},
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const buttons = Array.from(component.element.querySelectorAll('devtools-button'));
    const gotItButton =
        buttons.find(button => (button as Buttons.Button.Button).jslogContext === 'ai-assistance-v2-opt-in.got-it');
    assert.exists(gotItButton);
    (gotItButton as HTMLElement).click();

    sinon.assert.calledOnce(onGotIt);
  });

  it('calls onManageSettings when "Manage in settings" button is clicked', async () => {
    const onManageSettings = sinon.stub();
    const component = new AiAssistance.OptInChangeDialog.OptInChangeDialog({
      onGotIt: () => {},
      onManageSettings,
    });
    renderElementIntoDOM(component);
    await component.updateComplete;

    const buttons = Array.from(component.element.querySelectorAll('devtools-button'));
    const manageSettingsButton = buttons.find(
        button => (button as Buttons.Button.Button).jslogContext === 'ai-assistance-v2-opt-in.manage-settings');
    assert.exists(manageSettingsButton);
    (manageSettingsButton as HTMLElement).click();

    sinon.assert.calledOnce(onManageSettings);
  });
});
