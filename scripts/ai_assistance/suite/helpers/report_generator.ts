// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import type {Conversation} from '../types.js';

import {
  type BinaryStats,
  calculateStats,
  calculateWeightedScore,
  type JudgeStats,
  type Result,
  type ResultStore,
  type RougeStats,
} from './evaluators.ts';

/**
 * Renders the results for BINARY type evaluations.
 */
function renderBinaryResults(result: Extract<Result, {type: 'BINARY'}>): string {
  const stats = calculateStats(result) as BinaryStats;
  let html = `<div class="score-badge">Pass Rate: <strong>${stats.success} / ${stats.total}</strong></div>`;
  html += result.details
              .map(detail => {
                const statusClass = detail.success ? 'tag-pass' : 'tag-fail';
                const statusText = detail.success ? 'PASS' : 'FAIL';
                return renderConversationCard(
                    detail.conversation, 'Conversation', `<span class="tag ${statusClass}">${statusText}</span>`, '');
              })
              .join('');
  return html;
}

/**
 * Renders the results for JUDGE type evaluations.
 */
function renderJudgeResults(result: Extract<Result, {type: 'JUDGE'}>): string {
  const stats = calculateStats(result) as JudgeStats;
  let html =
      `<div class="score-badge">Average Overall: <strong>${stats.overallStats.average.toFixed(2)}</strong></div>`;
  html += result.details
              .map(
                  detail => {
                    const ratingsHtml =
                        `
      <div class="transcript-header">Ratings</div>
      <table>
        <thead><tr><th>Rubric</th><th>Score</th><th>Justification</th></tr></thead>
        <tbody>
          ${detail.rubricScores.map(rubric => `
            <tr>
              <td><strong>${rubric.rubric}</strong></td>
              <td><span class="score">${rubric.score}</span></td>
              <td class="reason">${rubric.reason.replace(/\n/g, '<br>')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
                    const overallScore = calculateWeightedScore(detail.rubricScores, result.rubricWeights);
                    return renderConversationCard(
                        detail.conversation, 'Conversation', `<span class="score">${overallScore.toFixed(2)}</span>`,
                        ratingsHtml);
                  })
              .join('');
  return html;
}

/**
 * Renders the results for ROUGE type evaluations.
 */
function renderRougeResults(result: Extract<Result, {type: 'ROUGE'}>): string {
  const stats = calculateStats(result) as RougeStats;
  let html = `<div class="score-badge">ROUGE-Lsum Average: <strong>${stats.average.toFixed(2)}</strong></div>`;
  html += result.details
              .map(detail => {
                const goldenHtml = `
      <div class="transcript-header">Golden Response</div>
      <pre>${detail.goldenResponse}</pre>`;
                return renderConversationCard(
                    detail.conversation, 'Conversation', `<span class="score">${detail.score.toFixed(2)}</span>`,
                    goldenHtml);
              })
              .join('');
  return html;
}

/**
 * Registry of renderers for different result types.
 */
const RESULT_RENDERERS: {[K in Result['type']]: (result: Extract<Result, {type: K}>) => string} = {
  BINARY: renderBinaryResults,
  JUDGE: renderJudgeResults,
  ROUGE: renderRougeResults,
};

/**
 * Renders a standard expandable card for a conversation.
 */
function renderConversationCard(
    conversation: Conversation, headerLabel: string, scoreElement: string, detailsHtml: string): string {
  return `
    <div class="card">
      <div class="card-header" onclick="toggleCard(this)">
        <span>${headerLabel} <code>${conversation.id}</code></span>
        ${scoreElement}
      </div>
      <div class="card-content">
        <div class="metadata">
          <span><strong>Model:</strong> ${conversation.model.id} (${conversation.model.version})</span>
          <span><strong>Chrome:</strong> ${conversation.chromeVersion}</span>
        </div>
        ${renderConversationTranscript(conversation)}
        ${detailsHtml}
      </div>
    </div>`;
}

/**
 * Renders the transcript of a conversation.
 */
function renderConversationTranscript(conversation: Conversation): string {
  return conversation.queries
      .map(query => {
        let html = '';
        if (query.request.prompt || query.request.functionCallResponse) {
          html += '<div class="transcript-header">Request</div>';
          if (query.request.prompt) {
            html += `<pre><strong>Query:</strong>\n${query.request.prompt}</pre>`;
          }
          if (query.request.functionCallResponse) {
            html += `<pre><strong>Function Response:</strong>\n${query.request.functionCallResponse}</pre>`;
          }
        }

        if (query.response.text || query.response.functionCallRequests?.length) {
          html += '<div class="transcript-header">Response</div>';
          if (query.response.text) {
            html += `<pre><strong>Explanation:</strong>\n${query.response.text}</pre>`;
          }
          if (query.response.functionCallRequests?.length) {
            const calls = query.response.functionCallRequests.map(r => `${r.name}(${JSON.stringify(r.args, null, 2)})`)
                              .join('\n\n');
            html += `<pre><strong>Function Calls:</strong>\n${calls}</pre>`;
          }
        }
        return html;
      })
      .join('');
}

/**
 * Renders the sidebar navigation.
 */
function renderSidebar(groups: Record<string, ResultStore[]>, allStores: ResultStore[]): string {
  return Object.entries(groups)
      .map(([type, stores]) => `
    <div class="nav-group">
      <div class="nav-group-title">${type}</div>
      ${stores.map(store => {
                const idx = allStores.indexOf(store);
                return `
        <div class="nav-item" onclick="document.getElementById('group-${idx}').scrollIntoView()">
          ${store.label}
        </div>`;
              }).join('')}
    </div>
  `).join('');
}

/**
 * Renders the main content area.
 */
function renderContent(allStores: ResultStore[]): string {
  return allStores
      .map((store, sIdx) => {
        let groupHtml = `
      <section id="group-${sIdx}">
        <div class="group-header">
          <h2 class="group-title">${store.type} / ${store.label}</h2>
        </div>`;

        for (const [test, dateToResult] of store.results) {
          groupHtml += `<h3>${test}</h3>`;
          const sortedDates = Array.from(dateToResult.keys()).sort();
          groupHtml += renderSummaryTable(dateToResult, sortedDates);

          for (const date of sortedDates) {
            const result = dateToResult.get(date);
            if (!result) {
              continue;
            }
            groupHtml += `<h4>Results for ${date}</h4>`;
            const renderer = RESULT_RENDERERS[result.type] as (r: Result) => string;
            groupHtml += renderer(result);
          }
        }
        groupHtml += `</section>`;
        return groupHtml;
      })
      .join('');
}

export function generateReport(stores: ResultStore|ResultStore[]): void {
  const allStores = Array.isArray(stores) ? stores : [stores];
  if (allStores.length === 0) {
    return;
  }

  const types = [...new Set(allStores.map(s => s.type))].sort();
  const typesSuffix = types.length > 0 ? `-${types.join('-')}` : '';
  const reportPath = path.join(process.cwd(), `eval-report${typesSuffix}.html`);

  const groups: Record<string, ResultStore[]> = {};
  for (const store of allStores) {
    groups[store.type] = groups[store.type] ?? [];
    groups[store.type].push(store);
  }

  const sidebarHtml = renderSidebar(groups, allStores);
  const contentHtml = renderContent(allStores);

  const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Assistance Evaluation Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto+Mono&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <style>${CSS}</style>
</head>
<body>
    <aside>
        <h1>Evaluations</h1>
        <div id="nav">${sidebarHtml}</div>
    </aside>
    <main>
        <div id="content">${contentHtml}</div>
    </main>
    <script>
      function toggleCard(header) {
        header.parentElement.classList.toggle('open');
      }
    </script>
</body>
</html>`;

  fs.writeFileSync(reportPath, finalHtml, 'utf8');
  console.log(`HTML Report generated: file://${reportPath}`);
}

/**
 * Renders a summary table comparing results across different dates for a specific test.
 */
function renderSummaryTable(dateToResult: Map<string, Result>, sortedDates: string[]): string {
  const results = Array.from(dateToResult.values());
  if (results.length === 0) {
    return '';
  }
  const firstResult = results[0];

  let html = '<table class="summary-table"><thead><tr><th>Rubric</th>';
  for (const date of sortedDates) {
    html += `<th>${date}</th>`;
  }
  html += '</tr></thead><tbody>';

  if (firstResult.type === 'JUDGE') {
    const rubrics = new Set<string>();
    for (const res of dateToResult.values()) {
      const stats = calculateStats(res);
      if (stats && 'statsByRubric' in stats) {
        Object.keys(stats.statsByRubric).forEach(r => rubrics.add(r));
      }
    }
    const sortedRubrics = Array.from(rubrics).sort();

    html += `<tr><td><strong>Weighted Overall</strong></td>`;
    for (const date of sortedDates) {
      const res = dateToResult.get(date);
      const stats = res ? calculateStats(res) : null;
      const score = stats && 'overallStats' in stats ? stats.overallStats.average.toFixed(2) : '-';
      html += `<td><strong>${score}</strong></td>`;
    }
    html += '</tr>';

    for (const rubric of sortedRubrics) {
      html += `<tr><td>${rubric}</td>`;
      for (const date of sortedDates) {
        const res = dateToResult.get(date);
        const stats = res ? calculateStats(res) : null;
        const val = (stats && 'statsByRubric' in stats) ? stats.statsByRubric[rubric]?.average.toFixed(2) : '-';
        html += `<td>${val ?? '-'}</td>`;
      }
      html += '</tr>';
    }
  } else if (firstResult.type === 'BINARY') {
    html += '<tr><td><strong>Pass Rate</strong></td>';
    for (const date of sortedDates) {
      const res = dateToResult.get(date);
      const stats = res ? calculateStats(res) : null;
      html += `<td>${(stats && 'success' in stats) ? `${stats.success} / ${stats.total}` : '-'}</td>`;
    }
    html += '</tr>';
  } else if (firstResult.type === 'ROUGE') {
    html += '<tr><td><strong>ROUGE-Lsum</strong></td>';
    for (const date of sortedDates) {
      const res = dateToResult.get(date);
      const stats = res ? calculateStats(res) : null;
      html += `<td>${(stats && 'average' in stats) ? stats.average.toFixed(2) : '-'}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

const CSS = `
:root {
  --primary: #1a73e8;
  --primary-hover: #185abc;
  --success: #1e8e3e;
  --error: #d93025;
  --bg: #f8f9fa;
  --sidebar-bg: #ffffff;
  --border: #dadce0;
  --text: #3c4043;
  --text-light: #70757a;
  --card-bg: #ffffff;
  --shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
}

body {
  font-family: 'Google Sans', Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  display: flex;
  height: 100vh;
  color: var(--text);
  background: var(--bg);
}

aside {
  width: 280px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 24px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

aside h1 {
  font-size: 20px;
  margin: 0 0 24px 0;
  color: var(--primary);
}

.nav-group {
  margin-bottom: 24px;
}

.nav-group-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-light);
  margin-bottom: 8px;
  letter-spacing: .8px;
}

.nav-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 14px;
  transition: background 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover {
  background: #f1f3f4;
}

main {
  flex-grow: 1;
  overflow-y: auto;
  padding: 48px;
  scroll-behavior: smooth;
}

section {
  max-width: 1000px;
  margin: 0 auto 64px auto;
}

.group-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 32px;
}

.group-title {
  font-size: 28px;
  margin: 0;
  color: var(--text);
}

h3 {
  font-size: 20px;
  margin: 40px 0 16px 0;
  color: var(--text);
}

h4 {
  font-size: 16px;
  margin: 24px 0 12px 0;
  color: var(--text-light);
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.card:hover {
  box-shadow: var(--shadow);
}

.card-header {
  padding: 16px 24px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.card-header:hover {
  background: #f8f9fa;
}

.card-content {
  padding: 24px;
  display: none;
  border-top: 1px solid var(--border);
  background: #ffffff;
}

.card.open .card-content {
  display: block;
}

.tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-pass { background: #e6f4ea; color: var(--success); }
.tag-fail { background: #fce8e6; color: var(--error); }

.score {
  font-size: 16px;
  font-weight: 700;
}

.score-badge {
  padding: 4px 12px;
  border-radius: 16px;
  background: #f1f3f4;
  font-size: 14px;
  display: inline-block;
  margin-bottom: 16px;
}

.metadata {
  color: var(--text-light);
  font-size: 12px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
}

pre {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid var(--border);
  white-space: pre-wrap;
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  margin: 8px 0;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 16px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

th, td {
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

th {
  background: #f8f9fa;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-light);
}

tr:last-child td {
  border-bottom: none;
}

.reason {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
}

.transcript-header {
  font-weight: 700;
  margin: 24px 0 12px 0;
  color: var(--primary);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.transcript-header::after {
  content: '';
  flex-grow: 1;
  height: 1px;
  background: var(--border);
}

.summary-table {
  margin: 24px 0 48px 0;
}

.summary-table td:first-child {
  width: 300px;
  font-weight: 500;
}
`;
