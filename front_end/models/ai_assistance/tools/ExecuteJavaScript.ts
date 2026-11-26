// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import type {FunctionHandlerOptions} from '../agents/AiAgent.js';
import {JavascriptExecutor, MAX_OBSERVATION_BYTE_LENGTH} from '../agents/ExecuteJavascript.js';
import {MAX_SERIALIZED_ELEMENT_UIDS} from '../EvaluateAction.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  isOriginAllowedByLock,
  type OriginLockCapability,
  type PageExecutionCapability,
  PermissionPrompt,
  type StyleMutationCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const lockedString = i18n.i18n.lockedString;

const MAX_LINES = 40;
// Deliberately higher than the 120-character soft target in
// `parameters.properties.code.description`: the prompt keeps the model aiming
// for <= 120 characters/line for readability, while this 160-character hard stop
// absorbs minor counting overshoots (`describeSizeLimitViolations()` reports 160
// when exceeded).
const MAX_LINE_LENGTH = 160;
const MAX_TOTAL_CHARACTERS = 2500;
const MAX_LONG_LINES_REPORTED = 3;
const LONG_LINE_PREVIEW_LENGTH = 60;

/**
 * Matches the error observations for network requests that the isolated
 * world's CSP (`FREESTYLER_WORLD_CSP`) blocks. When code run by this tool calls
 * `fetch()`, Chrome rejects with exactly "Failed to fetch". A synchronous
 * `XMLHttpRequest.send()` throws "Failed to execute 'send' on 'XMLHttpRequest':
 * Failed to load '<url>'.".
 */
const BLOCKED_NETWORK_ERROR_PATTERN =
    /^Error: (?:Failed to fetch$|Failed to execute 'send' on 'XMLHttpRequest': Failed to load )/;
const BLOCKED_NETWORK_HINT =
    'Network access (e.g., fetch, XMLHttpRequest) is blocked for JavaScript run by this tool, so this error does not mean the page\'s own network requests are failing. Do not retry network requests with this tool.';
/**
 * Only the V2 agent can load the network tools, so V1 agents do not get this
 * part of the hint.
 */
const NETWORK_TOOLS_HINT =
    'To inspect the page\'s network requests, load the `network` skill with `learnSkills` if it is not loaded yet, then use `listNetworkRequests` and `getNetworkRequestDetails`.';

/**
 * Matches `DataHandlerResult.result` observations for `ReferenceError`s thrown
 * when snippets read page-script globals in the `FREESTYLER_WORLD_NAME` isolated world.
 *
 * `JavascriptExecutor#generateObservation()` catches snippet errors in its
 * `try/catch` wrapper, so `EvaluateAction.stringifyError()` formats V8's
 * `Error#message` from `GetErrorStackOutput.message` without a `ReferenceError:` prefix:
 * - Single-line when `GetErrorStackOutput.stack` is empty in `getErrorStackOnThePage()`
 *   or unmapped: `'Error: sap is not defined'`.
 * - Two-line when `GetErrorStackOutput.stack` maps to a snippet line:
 *   `'Error: executing the line "sap.ui.getCore()" failed with the following error:\nsap is not defined'`.
 */
const ISOLATED_WORLD_REFERENCE_ERROR_PATTERN =
    /^Error: (?:executing the line .* failed with the following error:\n)?[\w$]+ is not defined$/;
const ISOLATED_WORLD_HINT =
    'JavaScript run by this tool executes in an isolated world: it shares the page DOM, while globals, framework instances, and customElements defined by page scripts cannot be read. If this identifier is defined by page scripts, do not assume it is missing; inspect DOM attributes, <script> tags, or loaded sources instead.';

/**
 * Recovery hint appended when an `executeJavaScript` snippet returns
 * `'undefined'` without assigning a top-level `data` variable.
 */
const MISSING_TOP_LEVEL_DATA_HINT =
    'No top-level `data` variable was assigned. Assign a top-level `data` variable directly (use top-level `await` instead of `.then()` or an IIFE; do not rely on inner `return` statements, bare expressions, or `data` declared inside a block).';

/**
 * Matches a column-zero top-level `data` declaration or assignment after common
 * leading indentation is stripped.
 *
 * Excludes equality comparisons (`data == x`, `data === x`) and arrow
 * parameters (`data => ...`) via `(?![=>])`, while matching both single-line
 * and multiline assignments such as `const data =\n  value;`.
 */
const TOP_LEVEL_DATA_ASSIGNMENT_PATTERN = /^(?:(?:const|let|var)\s+)?data\s*=(?![=>])/;

/**
 * Matches a hoisted, uninitialized top-level `let data;` or `var data;`
 * declaration at column zero after common leading indentation is stripped.
 */
const TOP_LEVEL_DATA_DECL_PATTERN = /^(?:let|var)\s+data\b/;

/**
 * Matches a `data = ...` assignment anywhere on a line, excluding property
 * writes such as `textNode.data = ...`, equality comparisons (`==`, `===`),
 * and arrow parameters (`data => ...`).
 *
 * After `TOP_LEVEL_DATA_ASSIGNMENT_PATTERN` returns `false`, any match here is
 * nested (not at column zero): paired with `TOP_LEVEL_DATA_DECL_PATTERN`, it
 * recognizes hoisted `let`/`var data;` assigned inside a branch; without a
 * top-level declaration, it catches un-awaited async IIFEs or blocks assigning
 * bare `data = ...`.
 */
const DATA_ASSIGNMENT_PATTERN = /(?:^|[^\w$.])data\s*=(?![=>])/;

/**
 * Matches a `const`, `let`, or `var` declaration of `data` that does not start
 * at column zero of normalized lines.
 *
 * Requiring a leading character (`^.+`) isolates declarations nested inside
 * blocks, callbacks, or IIFEs (such as `  const data = $0.id;`) from a hoisted
 * column-zero `let data;` or `var data;`.
 */
const NESTED_DATA_DECL_PATTERN = /^.+\b(?:const|let|var)\s+data\b/;

/**
 * Matches `return <value>` statements inside inner wrappers such as IIFEs or
 * callbacks where a returned value does not populate `data`.
 *
 * Top-level `return <value>` actually returns `<value>` from
 * `JavascriptExecutor#generateObservation()`. Requires a statement boundary
 * (`^`, `;`, `{`, or `)`) before `return` so string literals such as
 * `'click to return home'` are ignored, and uses horizontal whitespace `[ \t]+`
 * so semicolon-less bare guards (`if (!el)\n  return\nel.click();`) never
 * match across newlines. As a regex-only trade-off, approved mutations using
 * block-bodied callbacks with `return <expr>` (such as
 * `.filter(el => { return ...; })`) can still match.
 */
const VALUE_RETURN_PATTERN = /(?:^|[;{)])[ \t]*return[ \t]+[^;}\s]/;

/**
 * Matches `.then(` promise chains such as `doWork().then(r => ...)`.
 *
 * `JavascriptExecutor#generateObservation()` does not await unreturned promise
 * chains, so callbacks that assign `data` inside `.then(...)` leave the outer
 * `data` parameter `undefined` when the wrapper returns.
 */
const PROMISE_THEN_PATTERN = /\.then\s*\(/;

/**
 * Determines whether an `'undefined'` observation should include
 * `MISSING_TOP_LEVEL_DATA_HINT`.
 *
 * @param code Raw JavaScript snippet passed to `executeJavaScript`.
 * @param userApproved Whether the user explicitly approved execution after V8
 *     flagged side effects (`PermissionPrompt.ALLOW_ONCE`). Needed to separate
 *     intentional void mutations (such as `$0.click()`, where `userApproved` is
 *     `true` and returning `'undefined'` is expected) from read-only bare
 *     expressions (such as `document.title`, where `userApproved` is `false`
 *     because V8 proved zero mutations occurred under `throwOnSideEffect`).
 */
function shouldHintMissingTopLevelData(code: string, userApproved: boolean): boolean {
  // Strip shared outer indentation so column zero represents top-level statements.
  const nonBlankLines = code.split('\n').filter(line => /\S/.test(line));
  const minIndent = nonBlankLines.reduce((min, line) => Math.min(min, line.search(/\S/)), Infinity);
  const normalizedLines = nonBlankLines.map(line => line.slice(minIndent));

  // Top-level `data` was explicitly assigned (e.g. `const data = el?.id`), so
  // `undefined` is an expected value rather than a missing assignment.
  if (normalizedLines.some(line => TOP_LEVEL_DATA_ASSIGNMENT_PATTERN.test(line))) {
    return false;
  }

  // Block-scoped `data` declarations, inner `return <value>` statements, and
  // un-awaited `.then()` chains all leave the outer `data` parameter unset.
  const hasNestedOrIgnoredReturn = normalizedLines.some(
      line => NESTED_DATA_DECL_PATTERN.test(line) || VALUE_RETURN_PATTERN.test(line) || PROMISE_THEN_PATTERN.test(line),
  );
  if (hasNestedOrIgnoredReturn) {
    return true;
  }

  // Because column-zero assignments already returned above, any `data = ...`
  // match here is nested. Skip the hint only when `let`/`var data;` was hoisted
  // at top level (e.g. conditional branch assignment); otherwise hint to catch
  // un-awaited async IIFEs writing bare `data = ...`.
  const hasDataAssignment = normalizedLines.some(line => DATA_ASSIGNMENT_PATTERN.test(line));
  if (hasDataAssignment) {
    return !normalizedLines.some(line => TOP_LEVEL_DATA_DECL_PATTERN.test(line));
  }

  // No `data` assignment or ignored-return pattern was found. Hint only when
  // `!userApproved` (read-only execution); keep user-approved void mutations
  // hint-free.
  return !userApproved;
}

/**
 * Returns one message per size limit that the code exceeds. Each message states
 * the actual value, the limit, and how to fix it, so the model can correct
 * every problem in a single retry.
 */
function describeSizeLimitViolations(code: string): string[] {
  const violations: string[] = [];
  const lines = code.split('\n');

  if (lines.length > MAX_LINES) {
    violations.push(`- The code is ${lines.length} lines (max ${MAX_LINES}). ` +
        'Split the logic into smaller calls and return intermediate results in `data`.');
  }

  const longLines =
      lines.map((line, index) => ({lineNumber: index + 1, line})).filter(({line}) => line.length > MAX_LINE_LENGTH);
  if (longLines.length > 0) {
    violations.push(`- Lines longer than ${MAX_LINE_LENGTH} characters. Break them into shorter lines, ` +
        'for example by splitting long strings or selectors with concatenation, ' +
        'or by putting arguments on separate lines:');
    for (const {lineNumber, line} of longLines.slice(0, MAX_LONG_LINES_REPORTED)) {
      const preview = Platform.StringUtilities.trimEndWithMaxLength(line.trimStart(), LONG_LINE_PREVIEW_LENGTH);
      violations.push(`  - Line ${lineNumber} is ${line.length} characters: \`${preview}\``);
    }
    const unreportedCount = longLines.length - MAX_LONG_LINES_REPORTED;
    if (unreportedCount > 0) {
      violations.push(`  - ${unreportedCount} more ${unreportedCount === 1 ? 'line' : 'lines'} not shown.`);
    }
  }

  if (code.length > MAX_TOTAL_CHARACTERS) {
    violations.push(`- The code is ${code.length} characters (max ${MAX_TOTAL_CHARACTERS}). ` +
        'Remove unneeded code or split the logic into smaller calls.');
  }

  return violations;
}

export interface ExecuteJavaScriptArgs extends ToolArgs {
  code: string;
  explanation: string;
  title: string;
}

export class ExecuteJavaScriptTool implements
    DataTool<ExecuteJavaScriptArgs, unknown,
             BaseToolCapability&PageExecutionCapability&StyleMutationCapability&OriginLockCapability> {
  readonly name: ToolName = ToolName.EXECUTE_JAVASCRIPT;
  readonly permissionPrompt: PermissionPrompt = PermissionPrompt.ALLOW_ONCE;
  readonly permissionTitle: string = lockedString('Allow running JavaScript on the page?');
  readonly displayName: string = lockedString('Run JavaScript on the page');

  readonly description: string =
      'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request. Note: You cannot make network requests using this function.';

  /**
   * Checks the raw AI-generated code against the size limits and returns an
   * error message if any limit is exceeded.
   *
   * Validation runs directly on the unformatted input string so that line-length
   * checks match what `PermissionPrompt` displays and avoid false rejections
   * from formatter line collapsing.
   */
  static validateCode(code: string): string|undefined {
    const violations = describeSizeLimitViolations(code);
    if (violations.length > 0) {
      return [
        'Error: The code was not run because it exceeds size limits:',
        ...violations,
      ].join('\n');
    }
    return undefined;
  }

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ExecuteJavaScriptArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: false,
    properties: {
      // The `description` below purposefully states `max 120 characters per line`
      // as a soft target, while `MAX_LINE_LENGTH` enforces 160 as the hard stop.
      code: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: `JavaScript code snippet to run on the inspected page. Make sure the code is formatted for readability.

# Instructions

* To return data, define a top-level \`data\` variable and populate it with data you want to get. JSON-serializable objects and DOM \`Element\` objects (directly or inside objects/arrays) can be assigned to \`data\`. Serialized DOM \`Element\` objects are prefixed with \`(uid=<backendNodeId>)\` (for example \`(uid=15) <div id="card">...</div>\`, up to ${
            MAX_SERIALIZED_ELEMENT_UIDS} elements per call), whose numeric \`uid\` can be passed to tools accepting numeric element \`uid\`s. Serialized output must not exceed ${
            MAX_OBSERVATION_BYTE_LENGTH} bytes (return targeted properties or slices rather than full DOM subtrees).
* $0 refers to the currently selected DOM node (or document body if none selected).
* **CRITICAL** Top-level \`await\` works directly; never wrap code in an IIFE (such as \`(async () => { ... })()\`), rely on inner \`return\` statements, end with a bare expression, or declare \`data\` only inside an \`if\` block or function.
* **CRITICAL** Do not call \`console\` methods (e.g., \`console.log\`, \`console.warn\`, \`console.error\`) by default when returning data via \`data\`.
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Variables from previous function calls are not available in subsequent calls.
* **CRITICAL** Keep code concise (max 40 lines, max 120 characters per line, and max 2,500 total characters). To stay well under 120 characters per line:
  - Put each statement, object property, array item, and \`&&\`/\`||\` condition on its own line.
  - Extract long CSS selectors or strings into a variable (or \`.join(', ')\` array) before calling \`querySelectorAll\`.
  - Store intermediate DOM lookups (\`getComputedStyle\`, \`getAttribute\`) in short local variables instead of chaining them on one line.
  - Split complex logic into multiple steps.
* **CRITICAL** Network requests (e.g., fetch, XMLHttpRequest) are disabled and cannot be made.
* **CRITICAL** Code runs in an isolated world: it shares the page DOM, while globals, framework instances, and \`customElements\` defined by page scripts cannot be read. Do not assume a library is missing; inspect DOM attributes, \`<script>\` tags, or loaded sources instead.

For example, to query DOM elements:

\`\`\`
const data = {
  title: document.title,
  elementText: $0?.textContent?.trim(),
  childCount: $0?.children.length,
};
\`\`\`
`,
      },
      explanation: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Explain why you want to run this code',
      },
      title: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Provide a summary of what the code does. For example, "Checking related element styles".',
      },
    },
    required: ['code', 'explanation', 'title'],
  };

  displayInfoFromArgs(params: ExecuteJavaScriptArgs): {
    title: string,
    thought: string,
    action: string,
    javascriptCode: string,
  } {
    return {
      title: params.title,
      thought: params.explanation,
      action: params.code,
      javascriptCode: params.code,
    };
  }

  async handler(
      params: ExecuteJavaScriptArgs,
      context: BaseToolCapability&PageExecutionCapability&StyleMutationCapability&OriginLockCapability,
      options?: FunctionHandlerOptions,
      ): Promise<DataHandlerResult<unknown>> {
    const executionNode = context.getExecutionContextNode();
    if (!executionNode) {
      return {error: 'Error: Could not find the context node for execution.'};
    }

    if (!isOriginAllowedByLock(context.getOriginLock(), executionNode.securityOrigin())) {
      return {error: 'Error: Cannot execute JavaScript on cross-origin target.'};
    }

    const isV2Architecture = Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled;
    if (isV2Architecture) {
      const validationError = ExecuteJavaScriptTool.validateCode(params.code);
      if (validationError) {
        return {error: validationError};
      }
    }

    const executionMode = Root.Runtime.hostConfig.devToolsFreestyler?.executionMode ??
        Root.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;

    const executor = new JavascriptExecutor({
      executionMode,
      getContextNode: () => executionNode,
      createExtensionScope: context.createExtensionScope,
      changes: context.changeManager,
    },
                                            context.execJs);

    const result = await executor.executeAction(params.code, options);
    if ('result' in result && typeof result.result === 'string') {
      if (BLOCKED_NETWORK_ERROR_PATTERN.test(result.result)) {
        const hint = isV2Architecture ? `${BLOCKED_NETWORK_HINT} ${NETWORK_TOOLS_HINT}` : BLOCKED_NETWORK_HINT;
        return {...result, result: `${result.result}\n${hint}`};
      }
      if (ISOLATED_WORLD_REFERENCE_ERROR_PATTERN.test(result.result)) {
        return {...result, result: `${result.result}\n${ISOLATED_WORLD_HINT}`};
      }
      if (result.result === 'undefined' && shouldHintMissingTopLevelData(params.code, Boolean(options?.approved))) {
        return {...result, result: `${result.result}\n${MISSING_TOP_LEVEL_DATA_HINT}`};
      }
    }
    return result;
  }
}
