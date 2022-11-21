// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Formatter from '../../models/formatter/formatter.js';
import type * as Diff from '../../third_party/diff/diff.js';
import * as DiffView from '../../ui/components/diff_view/diff_view.js';

export function imageNameForResourceType(resourceType: Common.ResourceType.ResourceType): string {
  if (resourceType.isDocument()) {
    return 'ic_file_document';
  }
  if (resourceType.isImage()) {
    return 'ic_file_image';
  }
  if (resourceType.isFont()) {
    return 'ic_file_font';
  }
  if (resourceType.isScript()) {
    return 'ic_file_script';
  }
  if (resourceType.isStyleSheet()) {
    return 'ic_file_stylesheet';
  }
  if (resourceType.isWebbundle()) {
    return 'ic_file_webbundle';
  }
  return 'ic_file_default';
}

export async function formatCSSChangesFromDiff(diff: Diff.Diff.DiffArray): Promise<string> {
  const indent = '  ';
  const {originalLines, currentLines, rows} = DiffView.DiffView.buildDiffRows(diff);
  const originalRuleMaps = await buildStyleRuleMaps(originalLines.join('\n'));
  const currentRuleMaps = await buildStyleRuleMaps(currentLines.join('\n'));

  let changes = '';
  let recordedOriginalSelector, recordedCurrentSelector;
  let hasOpenDeclarationBlock = false;
  for (const {currentLineNumber, originalLineNumber, type} of rows) {
    if (type !== DiffView.DiffView.RowType.Deletion && type !== DiffView.DiffView.RowType.Addition) {
      continue;
    }

    const isDeletion = type === DiffView.DiffView.RowType.Deletion;
    const lines = isDeletion ? originalLines : currentLines;
    // Diff line arrays starts at 0, but line numbers start at 1.
    const lineIndex = isDeletion ? originalLineNumber - 1 : currentLineNumber - 1;
    const line = lines[lineIndex].trim();
    const {declarationIDToStyleRule, styleRuleIDToStyleRule} = isDeletion ? originalRuleMaps : currentRuleMaps;
    let styleRule;
    let prefix = '';
    if (declarationIDToStyleRule.has(lineIndex)) {
      styleRule = declarationIDToStyleRule.get(lineIndex) as FormattableStyleRule;
      const selector = styleRule.selector;
      // Use the equality of selector strings as a best-effort check for the equality of style rules.
      if (selector !== recordedOriginalSelector && selector !== recordedCurrentSelector) {
        prefix += `${selector} {\n`;
      }
      prefix += indent;
      hasOpenDeclarationBlock = true;
    } else {
      if (hasOpenDeclarationBlock) {
        prefix = '}\n\n';
        hasOpenDeclarationBlock = false;
      }
      if (styleRuleIDToStyleRule.has(lineIndex)) {
        styleRule = styleRuleIDToStyleRule.get(lineIndex);
      }
    }

    const processedLine = isDeletion ? `/* ${line} */` : line;
    changes += prefix + processedLine + '\n';
    if (isDeletion) {
      recordedOriginalSelector = styleRule?.selector;
    } else {
      recordedCurrentSelector = styleRule?.selector;
    }
  }

  if (changes.length > 0) {
    changes += '}';
  }
  return changes;
}

interface FormattableStyleRule {
  rule: Formatter.FormatterWorkerPool.CSSRule;
  selector: string;
}

async function buildStyleRuleMaps(content: string): Promise<{
  declarationIDToStyleRule: Map<number, FormattableStyleRule>,
  styleRuleIDToStyleRule: Map<number, FormattableStyleRule>,
}> {
  const rules = await new Promise<Formatter.FormatterWorkerPool.CSSRule[]>(res => {
    const rules: Formatter.FormatterWorkerPool.CSSRule[] = [];
    Formatter.FormatterWorkerPool.formatterWorkerPool().parseCSS(content, (isLastChunk, currentRules) => {
      rules.push(...currentRules);
      if (isLastChunk) {
        res(rules);
      }
    });
  });

  // We use line numbers as unique IDs for rules and declarations
  const declarationIDToStyleRule = new Map<number, FormattableStyleRule>();
  const styleRuleIDToStyleRule = new Map<number, FormattableStyleRule>();
  for (const rule of rules) {
    if ('styleRange' in rule) {
      const selector = rule.selectorText.split('\n').pop()?.trim();
      if (!selector) {
        continue;
      }
      const styleRule = {rule, selector};
      styleRuleIDToStyleRule.set(rule.styleRange.startLine, styleRule);
      for (const property of rule.properties) {
        declarationIDToStyleRule.set(property.range.startLine, styleRule);
      }
    }
  }
  return {declarationIDToStyleRule, styleRuleIDToStyleRule};
}

export function highlightElement(element: HTMLElement): void {
  element.scrollIntoViewIfNeeded();
  element.animate(
      [
        {offset: 0, backgroundColor: 'rgba(255, 255, 0, 0.2)'},
        {offset: 0.1, backgroundColor: 'rgba(255, 255, 0, 0.7)'},
        {offset: 1, backgroundColor: 'transparent'},
      ],
      {duration: 2000, easing: 'cubic-bezier(0, 0, 0.2, 1)'});
}
