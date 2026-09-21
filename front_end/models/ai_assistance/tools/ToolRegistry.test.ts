// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as AiAssistance from '../ai_assistance.js';

const SKILLS = AiAssistance.SkillRegistry.SKILLS;

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

  it('can retrieve getDetailedCallTree tool by name', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.GET_DETAILED_CALL_TREE);
    assert.exists(tool);
    assert.instanceOf(tool, AiAssistance.GetDetailedCallTree.GetDetailedCallTreeTool);
    assert.strictEqual(tool?.name, AiAssistance.Tool.ToolName.GET_DETAILED_CALL_TREE);
  });

  it('can retrieve getTraceFunctionCode tool by name', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.GET_TRACE_FUNCTION_CODE);
    assert.exists(tool);
    assert.instanceOf(tool, AiAssistance.GetTraceFunctionCode.GetTraceFunctionCodeTool);
    assert.strictEqual(tool?.name, AiAssistance.Tool.ToolName.GET_TRACE_FUNCTION_CODE);
  });

  it('can retrieve getTraceResourceContent tool by name', () => {
    const tool = AiAssistance.ToolRegistry.ToolRegistry.get(AiAssistance.Tool.ToolName.GET_TRACE_RESOURCE_CONTENT);
    assert.exists(tool);
    assert.instanceOf(tool, AiAssistance.GetTraceResourceContent.GetTraceResourceContentTool);
    assert.strictEqual(tool?.name, AiAssistance.Tool.ToolName.GET_TRACE_RESOURCE_CONTENT);
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
