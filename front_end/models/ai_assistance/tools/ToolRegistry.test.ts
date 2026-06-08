// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as AiAssistance from '../ai_assistance.js';

describe('ToolRegistry', () => {
  it('can retrieve getStyles tool by name', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.GET_STYLES);
    assert.exists(tool);
    assert.instanceOf(tool, AiAssistance.GetStyles.GetStylesTool);
    assert.strictEqual(tool?.name, AiAssistance.Tool.ToolName.GET_STYLES);
  });

  it('returns undefined for non-existent tools', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get('nonExistentTool');
    assert.isUndefined(tool);
  });

  it('returns undefined for built-in Object prototype properties', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get('toString');
    assert.isUndefined(tool);
  });
});
