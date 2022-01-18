// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';

export interface ParsedErrorFrame {
  line: string;
  link?: {
    url: string,
    lineNumber?: number,
    columnNumber?: number, enclosedInBraces: boolean, positionLeft: number, positionRight: number,
  };
}

/**
 * Takes a V8 Error#stack string and extracts source position information.
 *
 * The result includes the url, line and column number, as well as where
 * the url is found in the raw line.
 *
 * @returns Null if the provided string has an unexpected format. A
 *          populated `ParsedErrorFrame[]` otherwise.
 */
export function parseSourcePositionsFromErrorStack(
    runtimeModel: SDK.RuntimeModel.RuntimeModel, stack: string): ParsedErrorFrame[]|null {
  if (!/^[\w.]*Error\b/.test(stack)) {
    return null;
  }
  const debuggerModel = runtimeModel.debuggerModel();
  const baseURL = runtimeModel.target().inspectedURL();

  const lines = stack.split('\n');
  const linkInfos = [];
  for (const line of lines) {
    const isCallFrameLine = /^\s*at\s/.test(line);
    if (!isCallFrameLine && linkInfos.length && linkInfos[linkInfos.length - 1].link) {
      return null;
    }

    if (!isCallFrameLine) {
      linkInfos.push({line});
      continue;
    }

    let openBracketIndex = -1;
    let closeBracketIndex = -1;
    const inBracketsWithLineAndColumn = /\([^\)\(]+:\d+:\d+\)/g;
    const inBrackets = /\([^\)\(]+\)/g;
    let lastMatch: RegExpExecArray|null = null;
    let currentMatch;
    while ((currentMatch = inBracketsWithLineAndColumn.exec(line))) {
      lastMatch = currentMatch;
    }
    if (!lastMatch) {
      while ((currentMatch = inBrackets.exec(line))) {
        lastMatch = currentMatch;
      }
    }
    if (lastMatch) {
      openBracketIndex = lastMatch.index;
      closeBracketIndex = lastMatch.index + lastMatch[0].length - 1;
    }
    const hasOpenBracket = openBracketIndex !== -1;
    let left = hasOpenBracket ? openBracketIndex + 1 : line.indexOf('at') + 3;
    if (!hasOpenBracket && line.indexOf('async ') === left) {
      left += 6;
    }
    const right = hasOpenBracket ? closeBracketIndex : line.length;
    const linkCandidate = line.substring(left, right);
    const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(linkCandidate);
    if (splitResult.url === '<anonymous>') {
      linkInfos.push({line});
      continue;
    }
    let url = parseOrScriptMatch(debuggerModel, splitResult.url);
    if (!url && Common.ParsedURL.ParsedURL.isRelativeURL(splitResult.url)) {
      url = parseOrScriptMatch(debuggerModel, Common.ParsedURL.ParsedURL.completeURL(baseURL, splitResult.url));
    }
    if (!url) {
      return null;
    }

    linkInfos.push({
      line,
      link: {
        url,
        enclosedInBraces: hasOpenBracket,
        positionLeft: left,
        positionRight: right,
        lineNumber: splitResult.lineNumber,
        columnNumber: splitResult.columnNumber,
      },
    });
  }
  return linkInfos;
}

function parseOrScriptMatch(debuggerModel: SDK.DebuggerModel.DebuggerModel, url: string|null): string|null {
  if (!url) {
    return null;
  }
  const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
  if (parsedURL) {
    return parsedURL.url;
  }
  if (debuggerModel.scriptsForSourceURL(url).length) {
    return url;
  }
  // nodejs stack traces contain (absolute) file paths, but v8 reports them as file: urls.
  const fileUrl = new URL(url, 'file://');
  if (debuggerModel.scriptsForSourceURL(fileUrl.href).length) {
    return fileUrl.href;
  }
  return null;
}
