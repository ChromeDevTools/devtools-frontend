var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/stack_trace/ErrorStackParser.js
var ErrorStackParser_exports = {};
__export(ErrorStackParser_exports, {
  augmentErrorStackWithScriptIds: () => augmentErrorStackWithScriptIds,
  concatErrorDescriptionAndIssueSummary: () => concatErrorDescriptionAndIssueSummary,
  parseSourcePositionsFromErrorStack: () => parseSourcePositionsFromErrorStack
});
import * as Common from "./../../core/common/common.js";
function concatErrorDescriptionAndIssueSummary(description, issueSummary) {
  const pos = description.indexOf("\n");
  const prefix = pos === -1 ? description : description.substring(0, pos);
  const suffix = pos === -1 ? "" : description.substring(pos);
  description = `${prefix}. ${issueSummary}${suffix}`;
  return description;
}
function parseSourcePositionsFromErrorStack(runtimeModel, stack) {
  if (!(/\n\s*at\s/.test(stack) || stack.startsWith("SyntaxError:"))) {
    return null;
  }
  const debuggerModel = runtimeModel.debuggerModel();
  const baseURL = runtimeModel.target().inspectedURL();
  const lines = stack.split("\n");
  const linkInfos = [];
  for (const line of lines) {
    const match = /^\s*at\s(async\s)?/.exec(line);
    if (!match) {
      if (linkInfos.length && linkInfos[linkInfos.length - 1].isCallFrame) {
        return null;
      }
      linkInfos.push({ line });
      continue;
    }
    const isCallFrame = true;
    let left = match[0].length;
    let right = line.length;
    let enclosedInBraces = false;
    if (line[right - 1] === ")") {
      right--;
      enclosedInBraces = true;
      left = line.lastIndexOf(" (", right);
      if (left < 0) {
        return null;
      }
      left += 2;
      const newRight = line.indexOf("), ", left);
      if (newRight > left) {
        right = newRight;
      }
    }
    const linkCandidate = line.substring(left, right);
    const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(linkCandidate);
    if (splitResult.url === "<anonymous>") {
      if (linkInfos.length && linkInfos[linkInfos.length - 1].isCallFrame && !linkInfos[linkInfos.length - 1].link) {
        linkInfos[linkInfos.length - 1].line += `
${line}`;
      } else {
        linkInfos.push({ line, isCallFrame });
      }
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
      isCallFrame,
      link: {
        url,
        prefix: line.substring(0, left),
        suffix: line.substring(right),
        enclosedInBraces,
        lineNumber: splitResult.lineNumber,
        columnNumber: splitResult.columnNumber
      }
    });
  }
  return linkInfos;
}
function parseOrScriptMatch(debuggerModel, url) {
  if (!url) {
    return null;
  }
  if (Common.ParsedURL.ParsedURL.isValidUrlString(url)) {
    return url;
  }
  if (debuggerModel.scriptsForSourceURL(url).length) {
    return url;
  }
  const fileUrl = new URL(url, "file://");
  if (debuggerModel.scriptsForSourceURL(fileUrl.href).length) {
    return fileUrl.href;
  }
  return null;
}
function augmentErrorStackWithScriptIds(parsedFrames, protocolStackTrace) {
  for (const parsedFrame of parsedFrames) {
    const protocolFrame = protocolStackTrace.callFrames.find((frame) => framesMatch(parsedFrame, frame));
    if (protocolFrame && parsedFrame.link) {
      parsedFrame.link.scriptId = protocolFrame.scriptId;
    }
  }
}
function framesMatch(parsedFrame, protocolFrame) {
  if (!parsedFrame.link) {
    return false;
  }
  const { url, lineNumber, columnNumber } = parsedFrame.link;
  return url === protocolFrame.url && lineNumber === protocolFrame.lineNumber && columnNumber === protocolFrame.columnNumber;
}

// gen/front_end/models/stack_trace/StackTrace.js
var StackTrace_exports = {};
__export(StackTrace_exports, {
  DebuggableFrameFlavor: () => DebuggableFrameFlavor
});
var DebuggableFrameFlavor = class _DebuggableFrameFlavor {
  static #last;
  frame;
  /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
  constructor(frame) {
    this.frame = frame;
  }
  get sdkFrame() {
    return this.frame.sdkFrame;
  }
  /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
  static for(frame) {
    function equals(a, b) {
      return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line && a.column === b.column && a.sdkFrame === b.sdkFrame && JSON.stringify(a.missingDebugInfo) === JSON.stringify(b.missingDebugInfo);
    }
    if (!_DebuggableFrameFlavor.#last || !equals(_DebuggableFrameFlavor.#last.frame, frame)) {
      _DebuggableFrameFlavor.#last = new _DebuggableFrameFlavor(frame);
    }
    return _DebuggableFrameFlavor.#last;
  }
};
export {
  ErrorStackParser_exports as ErrorStackParser,
  StackTrace_exports as StackTrace
};
//# sourceMappingURL=stack_trace.js.map
