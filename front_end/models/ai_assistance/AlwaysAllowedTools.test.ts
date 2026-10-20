// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createSettingsForTest} from '../../testing/SettingsHelpers.js';

import * as AiAssistance from './ai_assistance.js';

const {AlwaysAllowedTools} = AiAssistance.AlwaysAllowedTools;
const {ToolName} = AiAssistance.Tool;

describe('AlwaysAllowedTools', () => {
  beforeEach(() => {
    updateHostConfig({devToolsAiNaturalLanguageInterface: {enabled: true}});
  });

  it('does not allow tools by default', () => {
    const alwaysAllowedTools = new AlwaysAllowedTools(createSettingsForTest());

    assert.isFalse(alwaysAllowedTools.isAllowed(ToolName.GET_COOKIE_VALUES));
  });

  it('allows a tool', () => {
    const alwaysAllowedTools = new AlwaysAllowedTools(createSettingsForTest());

    alwaysAllowedTools.allow(ToolName.GET_COOKIE_VALUES);

    assert.isTrue(alwaysAllowedTools.isAllowed(ToolName.GET_COOKIE_VALUES));
    assert.isFalse(alwaysAllowedTools.isAllowed(ToolName.GET_STORAGE_VALUES));
  });

  it('persists allowed tools in settings', () => {
    const settings = createSettingsForTest();
    new AlwaysAllowedTools(settings).allow(ToolName.GET_COOKIE_VALUES);

    assert.isTrue(new AlwaysAllowedTools(settings).isAllowed(ToolName.GET_COOKIE_VALUES));
  });

  it('does not store a tool twice', () => {
    const settings = createSettingsForTest();
    const alwaysAllowedTools = new AlwaysAllowedTools(settings);

    alwaysAllowedTools.allow(ToolName.GET_COOKIE_VALUES);
    alwaysAllowedTools.allow(ToolName.GET_COOKIE_VALUES);

    assert.deepEqual(settings.createSetting<string[]>('ai-assistance-always-allowed-tools', []).get(),
                     [ToolName.GET_COOKIE_VALUES]);
  });

  describe('when natural language interface is disabled', () => {
    beforeEach(() => {
      updateHostConfig({devToolsAiNaturalLanguageInterface: {enabled: false}});
    });

    it('does not allow a tool', () => {
      const settings = createSettingsForTest();
      const alwaysAllowedTools = new AlwaysAllowedTools(settings);

      alwaysAllowedTools.allow(ToolName.GET_COOKIE_VALUES);

      assert.isFalse(alwaysAllowedTools.isAllowed(ToolName.GET_COOKIE_VALUES));
      assert.deepEqual(settings.createSetting<string[]>('ai-assistance-always-allowed-tools', []).get(), []);
    });

    it('ignores tools already stored in settings', () => {
      const settings = createSettingsForTest();
      settings.createSetting<string[]>('ai-assistance-always-allowed-tools', []).set([ToolName.GET_COOKIE_VALUES]);

      const alwaysAllowedTools = new AlwaysAllowedTools(settings);

      assert.isFalse(alwaysAllowedTools.isAllowed(ToolName.GET_COOKIE_VALUES));
    });
  });
});
