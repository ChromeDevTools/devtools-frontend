// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import * as Formatter from '../formatter/formatter.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

/** Represents the source code for a given function, including additional context of surrounding lines. */
export interface FunctionCode {
  functionBounds: Workspace.UISourceCode.UIFunctionBounds;
  /** The text of `uiSourceCode`. */
  text: TextUtils.Text.Text;
  /** The function text. */
  code: string;
  /** The range of `code` within `text`. */
  range: TextUtils.TextRange.TextRange;
  /** The function text, plus some additional context before and after. The actual function is wrapped in <FUNCTION_START>...<FUNCTION_END> */
  codeWithContext: string;
  /** The range of `codeWithContext` within `text`. */
  rangeWithContext: TextUtils.TextRange.TextRange;
}

export interface CreateFunctionCodeOptions {
  /** Number of characters to include before and after the function. Stacks with `contextLineLength`. */
  contextLength?: number;
  /** Number of lines to include before and after the function. Stacks with `contextLength`. */
  contextLineLength?: number;
}

function createFunctionCode(
    uiSourceCodeContent: string, formattedContent: Formatter.ScriptFormatter.FormattedContent|null,
    functionBounds: Workspace.UISourceCode.UIFunctionBounds, options?: CreateFunctionCodeOptions): FunctionCode {
  let {startLine, startColumn, endLine, endColumn} = functionBounds.range;
  let text;
  if (formattedContent) {
    text = new TextUtils.Text.Text(formattedContent.formattedContent);

    const startMapped = formattedContent.formattedMapping.originalToFormatted(startLine, startColumn);
    startLine = startMapped[0];
    startColumn = startMapped[1];

    const endMapped = formattedContent.formattedMapping.originalToFormatted(endLine, endColumn);
    endLine = endMapped[0];
    endColumn = endMapped[1];
  } else {
    text = new TextUtils.Text.Text(uiSourceCodeContent);
  }

  const content = text.value();

  // Define two ranges - the first is just the function bounds, the second includes
  // that plus some surrounding context as dictated by the options.
  const range = new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn);

  const functionStartOffset = text.offsetFromPosition(startLine, startColumn);
  const functionEndOffset = text.offsetFromPosition(endLine, endColumn);

  let contextStartOffset = 0;
  if (options?.contextLength !== undefined) {
    const contextLength = options.contextLength;
    contextStartOffset = Math.max(contextStartOffset, functionStartOffset - contextLength);
  }
  if (options?.contextLineLength !== undefined) {
    const contextLineLength = options.contextLineLength;
    const position = text.offsetFromPosition(Math.max(startLine - contextLineLength, 0), 0);
    contextStartOffset = Math.max(contextStartOffset, position);
  }

  let contextEndOffset = content.length;
  if (options?.contextLength !== undefined) {
    const contextLength = options.contextLength;
    contextEndOffset = Math.min(contextEndOffset, functionEndOffset + contextLength);
  }
  if (options?.contextLineLength !== undefined) {
    const contextLineLength = options.contextLineLength;
    const position =
        text.offsetFromPosition(Math.min(endLine + contextLineLength, text.lineCount() - 1), Number.POSITIVE_INFINITY);
    contextEndOffset = Math.min(contextEndOffset, position);
  }

  const contextStart = text.positionFromOffset(contextStartOffset);
  const contextEnd = text.positionFromOffset(contextEndOffset);
  const rangeWithContext = new TextUtils.TextRange.TextRange(
      contextStart.lineNumber, contextStart.columnNumber, contextEnd.lineNumber, contextEnd.columnNumber);

  // Grab substrings for the function range, and for the context range.
  const code = content.substring(functionStartOffset, functionEndOffset);
  const before = content.substring(contextStartOffset, functionStartOffset);
  const after = content.substring(functionEndOffset, contextEndOffset);
  const codeWithContext = before + `<FUNCTION_START>${code}<FUNCTION_END>` + after;

  return {
    functionBounds,
    text,
    code,
    range,
    codeWithContext,
    rangeWithContext,
  };
}

/**
 * The input location may be a source mapped location or a raw location.
 */
export async function getFunctionCodeFromLocation(
    target: SDK.Target.Target, url: Platform.DevToolsPath.UrlString, line: number, column: number,
    options?: CreateFunctionCodeOptions): Promise<FunctionCode|null> {
  const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  if (!debuggerModel) {
    throw new Error('missing debugger model');
  }

  let uiSourceCode;
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const projects = debuggerWorkspaceBinding.workspace.projectsForType(Workspace.Workspace.projectTypes.Network);
  for (const project of projects) {
    uiSourceCode = project.uiSourceCodeForURL(url);
    if (uiSourceCode) {
      break;
    }
  }

  if (!uiSourceCode) {
    return null;
  }

  const rawLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, line, column);
  const rawLocation = rawLocations.at(-1);
  if (!rawLocation) {
    return null;
  }

  return await getFunctionCodeFromRawLocation(rawLocation, options);
}

const formatCache =
    new WeakMap<Workspace.UISourceCode.UISourceCode, Promise<Formatter.ScriptFormatter.FormattedContent|null>>();

async function formatAndCache(uiSourceCode: Workspace.UISourceCode.UISourceCode, content: string):
    Promise<Formatter.ScriptFormatter.FormattedContent|null> {
  let cachedPromise = formatCache.get(uiSourceCode);
  if (cachedPromise) {
    return await cachedPromise;
  }

  const contentType = uiSourceCode.contentType();
  const shouldFormat = !contentType.isFromSourceMap() && (contentType.isDocument() || contentType.isScript()) &&
      TextUtils.TextUtils.isMinified(content);
  if (!shouldFormat) {
    return null;
  }

  cachedPromise = Formatter.ScriptFormatter.formatScriptContent(contentType.canonicalMimeType(), content, '\t');
  formatCache.set(uiSourceCode, cachedPromise);
  return await cachedPromise;
}

/**
 * Returns a {@link FunctionCode} for the given raw location.
 */
export async function getFunctionCodeFromRawLocation(
    rawLocation: SDK.DebuggerModel.Location, options?: CreateFunctionCodeOptions): Promise<FunctionCode|null> {
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const functionBounds = await debuggerWorkspaceBinding.functionBoundsAtRawLocation(rawLocation);
  if (!functionBounds) {
    return null;
  }

  await functionBounds.uiSourceCode.requestContentData();
  const content = functionBounds.uiSourceCode.content();
  if (!content) {
    return null;
  }

  const formattedContent = await formatAndCache(functionBounds.uiSourceCode, content);
  return createFunctionCode(content, formattedContent, functionBounds, options);
}
