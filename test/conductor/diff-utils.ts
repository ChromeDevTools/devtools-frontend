// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

// @ts-expect-error
import * as diffImport from 'diff';

const diff: any = diffImport;

type DiffCallback = (line: string) => string;

function sanitize(message: string): string {
  return message.replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#39;');
}

export function*
    formatDiff(diffBlocks: Array<{value: string, added: boolean, removed: boolean}>, onSame: DiffCallback,
               onAdded: DiffCallback, onRemoved: DiffCallback): Generator<string, void, unknown> {
  for (const block of diffBlocks) {
    const lines = block.value.split('\n').filter(l => l.length > 0);
    if (!block.added && !block.removed && lines.length > 3) {
      yield onSame(lines[0]);
      yield onSame('  ...');
      yield onSame(lines[lines.length - 1]);
    } else {
      for (const line of lines) {
        if (block.added) {
          yield onAdded(line);
        } else if (block.removed) {
          yield onRemoved(line);
        } else {
          yield onSame(line);
        }
      }
    }
  }
}

export function resultAssertionsDiff(assertionErrors: any[]): any {
  if (!assertionErrors || assertionErrors.length === 0) {
    return [];
  }
  const firstError = assertionErrors[0];

  if (!firstError) {
    return [];
  }

  const formatValue = (value: any) => {
    return (value && typeof value === 'object') ? JSON.stringify(value, null, 2) : String(value);
  };

  const expected = formatValue(firstError.expected);
  const actual = formatValue(firstError.actual);

  return diff.diffLines(expected, actual);
}

export function formatDiffText(assertionDiff: any[]): string|null {
  const diffLines =
      Array.from(formatDiff(assertionDiff, same => ` ${same}`, actual => `+${actual}`, expected => `-${expected}`));

  if (diffLines.length > 0) {
    return [
      '- expected',
      '+ actual',
      '',
      ...diffLines,
    ].join('\n');
  }
  return null;
}
// The max length of the summary is 4000, but we need to leave some room for
// the rest of the HTML formatting (e.g. <pre> and </pre>).
const SUMMARY_LENGTH_CUTOFF = 3950;

export function formatSummary(message: string, diffText: string|null, cutoff: number = SUMMARY_LENGTH_CUTOFF): string {
  let summary = message;
  if (diffText) {
    summary += '\n\n' + diffText;
  }

  const lines = summary.split('\n');
  let result = '';
  let currentLength = 13;  // for <pre></pre> and some safety margin

  for (const line of lines) {
    const sanitized = sanitize(line);
    let highlighted = sanitized;
    if (line.startsWith('+')) {
      highlighted = `<span style="color: green;">${sanitized}</span>`;
    } else if (line.startsWith('-')) {
      highlighted = `<span style="color: red;">${sanitized}</span>`;
    }

    if (currentLength + highlighted.length + 1 > cutoff) {
      result += '\n... (truncated)';
      break;
    }
    if (result.length > 0) {
      result += '\n';
    }
    result += highlighted;
    currentLength += highlighted.length + 1;
  }

  return `<pre>${result}</pre>`;
}

export function formatAsHtml(assertionDiff: any): string|null {
  const diffText = formatDiffText(assertionDiff);
  if (!diffText) {
    return null;
  }
  return formatSummary('', diffText);
}
