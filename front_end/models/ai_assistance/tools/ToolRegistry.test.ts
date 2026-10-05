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

  describe('permissionPrompt', () => {
    function filterToolNames(permissionPrompt: AiAssistance.Tool.PermissionPrompt): string[] {
      return Object.entries(AiAssistance.ToolRegistry.TOOLS)
          .filter(([, tool]) => tool.permissionPrompt === permissionPrompt)
          .map(([toolName]) => toolName)
          .sort();
    }

    it('uses ALLOW_ONCE for correct tools', () => {
      const expectedToolNames: string[] = [
        AiAssistance.Tool.ToolName.EXECUTE_JAVASCRIPT,
        AiAssistance.Tool.ToolName.GET_COOKIE_VALUES,
        AiAssistance.Tool.ToolName.GET_STORAGE_VALUES,
      ].sort();

      const permissionPrompt = AiAssistance.Tool.PermissionPrompt.ALLOW_ONCE;
      const toolNames = filterToolNames(permissionPrompt);
      assert.deepEqual(toolNames, expectedToolNames);
    });

    it('uses ALLOW_ONCE_OR_ALWAYS for correct tools', () => {
      const expectedToolNames: string[] = [].sort();

      const permissionPrompt = AiAssistance.Tool.PermissionPrompt.ALLOW_ONCE_OR_ALWAYS;
      const toolNames = filterToolNames(permissionPrompt);
      assert.deepEqual(toolNames.sort(), expectedToolNames);
    });

    it('uses NEVER for correct tools', () => {
      const expectedToolNames: string[] = [
        AiAssistance.Tool.ToolName.GET_DETAILED_CALL_TREE,
        AiAssistance.Tool.ToolName.GET_ELEMENT_ACCESSIBILITY_DETAILS,
        AiAssistance.Tool.ToolName.GET_INSIGHT_DETAILS,
        AiAssistance.Tool.ToolName.GET_LIGHTHOUSE_AUDITS,
        AiAssistance.Tool.ToolName.GET_NETWORK_REQUEST_DETAILS,
        AiAssistance.Tool.ToolName.GET_SOURCE_CONTENT,
        AiAssistance.Tool.ToolName.GET_STORAGE_BREAKDOWN,
        AiAssistance.Tool.ToolName.GET_STYLES,
        AiAssistance.Tool.ToolName.GET_TRACE_EVENT_BY_KEY,
        AiAssistance.Tool.ToolName.GET_TRACE_FUNCTION_CODE,
        AiAssistance.Tool.ToolName.GET_TRACE_MAIN_THREAD_SUMMARY,
        AiAssistance.Tool.ToolName.GET_TRACE_NETWORK_SUMMARY,
        AiAssistance.Tool.ToolName.GET_TRACE_RESOURCE_CONTENT,
        AiAssistance.Tool.ToolName.LIST_COOKIES,
        AiAssistance.Tool.ToolName.LIST_NETWORK_REQUESTS,
        AiAssistance.Tool.ToolName.LIST_PAGE_ORIGINS,
        AiAssistance.Tool.ToolName.LIST_SOURCES,
        AiAssistance.Tool.ToolName.LIST_STORAGE_KEYS,
        AiAssistance.Tool.ToolName.RECORD_PERFORMANCE_TRACE,
        AiAssistance.Tool.ToolName.RESOLVE_DEVTOOLS_NODE_PATH,
        AiAssistance.Tool.ToolName.RUN_LIGHTHOUSE,
        AiAssistance.Tool.ToolName.SELECT_TRACE_EVENT_BY_KEY,
      ].sort();

      const permissionPrompt = AiAssistance.Tool.PermissionPrompt.NEVER;
      const toolNames = filterToolNames(permissionPrompt);
      assert.deepEqual(toolNames, expectedToolNames);
    });
  });

  it('sets permissionTitle on tools that ask for approval', () => {
    const toolsThatAlwaysAsk: string[] = [
      AiAssistance.Tool.ToolName.EXECUTE_JAVASCRIPT,
      AiAssistance.Tool.ToolName.GET_COOKIE_VALUES,
      AiAssistance.Tool.ToolName.GET_STORAGE_VALUES,
    ];
    for (const toolName of toolsThatAlwaysAsk) {
      const tool = AiAssistance.ToolRegistry.ToolRegistry.get(toolName);
      assert.exists(tool, `Tool "${toolName}" does not exist in ToolRegistry`);
      assert.isNotEmpty(tool.permissionTitle, `Tool "${toolName}" has no permissionTitle`);
    }
  });
});
