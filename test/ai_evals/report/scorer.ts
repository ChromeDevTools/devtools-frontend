// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Turns Grading V1 check verdicts into a task score.
 *
 * - M: sum of all positive weights, whether the check passed or not.
 * - P: sum of the positive weights with a `true` verdict.
 * - N: sum of the absolute negative weights with a `true` verdict (penalties that happened).
 * - rawScore = max(0, (P - N) / M); pass if rawScore >= 0.7.
 *
 * If a critical penalty is `true`, the task fails and its score is capped below the pass
 * threshold, while the full check breakdown is still reported.
 */

export const PASS_SCORE_THRESHOLD = 0.7;

const SCORE_DECIMALS = 4;
const MAX_REASON_LENGTH = 300;

// Only the LLM judge produces verdicts today. Add more sources (for example
// code-based state checks) when evals need them.
export const CheckSource = {
  JUDGE: 'judge',
} as const;
export type CheckSource = (typeof CheckSource)[keyof typeof CheckSource];

export interface GradingCheckRow {
  id: string;
  /** Where the verdict comes from. */
  source: CheckSource;
  /**
   * Whether the check statement held on the trajectory: `true` earns points for
   * positive expectations (`weight > 0`) and deducts points for penalties (`weight < 0`).
   */
  verdict: boolean;
  /** Integer weight: positive for expectations, negative for penalties. */
  weight: number;
  /** True for critical penalties (listed in `weights.critical`). */
  critical?: boolean;
  reason: string;
}

export interface ScoreResult {
  /** Score from 0 to 1 rounded to 4 decimals, or null if ungraded or on a grading error. */
  score: number|null;
  /** Unrounded and uncapped score, or null if ungraded or on a grading error. */
  rawScore: number|null;
  /** Pass/fail, or null if ungraded or on a grading error. */
  pass: boolean|null;
  /** M: sum of all positive weights. */
  maxPoints: number;
  /** P: sum of positive weights with a `true` verdict. */
  earnedPoints: number;
  /** N: sum of absolute negative weights with a `true` verdict. */
  penaltyPoints: number;
  /** Ids of critical penalties with a `true` verdict. */
  criticalFailures: string[];
  checks: GradingCheckRow[];
  gradingError?: string;
}

function roundScore(value: number): number {
  return Number(value.toFixed(SCORE_DECIMALS));
}

/**
 * Computes the score of a task from its checks.
 * A task with no checks is ungraded (null), not passed. A grading error also
 * gives a null score, never 0.
 */
export function scoreChecks(checks: GradingCheckRow[], gradingError?: string): ScoreResult {
  let maxPoints = 0;
  let earnedPoints = 0;
  let penaltyPoints = 0;
  const criticalFailures: string[] = [];
  for (const {id, verdict, weight, critical} of checks) {
    if (weight > 0) {
      maxPoints += weight;
      earnedPoints += verdict ? weight : 0;
    } else if (verdict) {
      penaltyPoints -= weight;
      if (critical) {
        criticalFailures.push(id);
      }
    }
  }
  const result = {maxPoints, earnedPoints, penaltyPoints, criticalFailures, checks};

  if (gradingError !== undefined || checks.length === 0) {
    return {score: null, rawScore: null, pass: null, ...result, gradingError};
  }

  let rawScore: number;
  if (maxPoints > 0) {
    rawScore = Math.max(0, (earnedPoints - penaltyPoints) / maxPoints);
  } else {
    // Only penalties: the task is perfect unless one of them happened.
    rawScore = penaltyPoints > 0 ? 0 : 1;
  }
  if (criticalFailures.length) {
    return {score: roundScore(Math.min(rawScore, PASS_SCORE_THRESHOLD - 0.01)), rawScore, pass: false, ...result};
  }
  // Pass is decided on the unrounded score. Four decimals keep e.g. 16/23 = 0.6957 from showing as 0.70.
  return {score: roundScore(rawScore), rawScore, pass: rawScore >= PASS_SCORE_THRESHOLD, ...result};
}

function formatCell(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').replaceAll('|', '\\|').trim();
  return singleLine.length > MAX_REASON_LENGTH ? `${singleLine.slice(0, MAX_REASON_LENGTH - 1)}…` : singleLine;
}

function formatCheckCells(check: GradingCheckRow): string[] {
  const weight = `${check.weight}${check.critical ? ' (critical)' : ''}`;
  return [check.id, check.source, String(check.verdict), weight, formatCell(check.reason)];
}

/**
 * Formats the score summary and the check table (`id | source | verdict | weight | reason`)
 * as Markdown, for the run output and `grader_output/grader.log`.
 */
export function formatCheckTable(result: ScoreResult): string {
  const lines: string[] = [];
  if (result.gradingError !== undefined) {
    lines.push(`Score: null (grading error: ${result.gradingError})`);
  } else if (result.score === null) {
    lines.push('Score: null (ungraded)');
  } else {
    lines.push(`Score: ${result.score.toFixed(SCORE_DECIMALS)} (${result.pass ? 'pass' : 'fail'})`);
  }
  lines.push(`M=${result.maxPoints} P=${result.earnedPoints} N=${result.penaltyPoints}, critical: ${
      result.criticalFailures.length ? result.criticalFailures.join(', ') : 'none'}`);
  if (result.checks.length === 0) {
    return lines.join('\n');
  }

  const header = ['id', 'source', 'verdict', 'weight', 'reason'];
  const rows = result.checks.map(formatCheckCells);
  // Pad all columns but the last one, so that the table is readable in plain text logs too.
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map(row => row[column].length)));
  const formatRow = (cells: string[]): string =>
      `| ${cells.map((cell, column) => column < cells.length - 1 ? cell.padEnd(widths[column]) : cell).join(' | ')} |`;
  lines.push('', formatRow(header), formatRow(widths.map(width => '-'.repeat(width))));
  lines.push(...rows.map(formatRow));
  return lines.join('\n');
}
