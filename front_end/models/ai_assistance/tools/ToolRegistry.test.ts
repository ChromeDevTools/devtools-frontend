// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as AiAssistance from '../ai_assistance.js';
import {SKILLS} from '../skills/SkillRegistry.js';

describe('ToolRegistry', () => {
  it('can retrieve executeJavaScript tool by name', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.EXECUTE_JAVASCRIPT);
    assert.exists(tool);
    assert.instanceOf(tool, AiAssistance.ExecuteJavaScript.ExecuteJavaScriptTool);
    assert.strictEqual(tool?.name, AiAssistance.Tool.ToolName.EXECUTE_JAVASCRIPT);
  });

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

  it('verifies all tools listed in all active skills exist in the ToolRegistry', () => {
    for (const [skillName, skill] of Object.entries(SKILLS)) {
      for (const toolName of skill.allowedTools) {
        const tool = AiAssistance.ToolRegistry.ToolRegistry.get(toolName);
        assert.exists(tool, `Tool "${toolName}" required by skill "${skillName}" does not exist in ToolRegistry`);
      }
    }
  });
});
