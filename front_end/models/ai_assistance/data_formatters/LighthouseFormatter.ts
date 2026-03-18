// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as LHModel from '../../lighthouse/lighthouse.js';

/**
 * A formatter that takes a raw Lighthouse report JSON and creates a markdown
 * summary for an AI Agent.
 */
export class LighthouseFormatter {
  /**
   * Returns an overall summary and high-level overview of the Lighthouse report.
   */
  summary(report: LHModel.ReporterTypes.ReportJSON): string {
    const lines: string[] = [];
    lines.push('# Lighthouse Report Summary');
    lines.push(`URL: ${report.finalDisplayedUrl}`);
    lines.push(`Fetch Time: ${report.fetchTime}`);
    lines.push(`Lighthouse Version: ${report.lighthouseVersion}`);
    lines.push('');
    lines.push('## Category Scores');
    for (const category of Object.values(report.categories)) {
      const score = category.score !== null ? Math.round(category.score * 100) : 'n/a';
      lines.push(`- ${category.title}: ${score}`);
    }
    return lines.join('\n');
  }

  /**
   * Returns a markdown list of all audits in a given category.
   * Highlight failing audits (score < 90).
   */
  audits(report: LHModel.ReporterTypes.ReportJSON, categoryId: LHModel.RunTypes.CategoryId): string {
    const category = report.categories[categoryId];
    if (!category) {
      return `Category "${categoryId}" not found.`;
    }

    const lines: string[] = [];
    lines.push(`# Audits for ${category.title}`);
    if (category.description) {
      lines.push(`${category.description.replace(/\n/g, ' ')}`);
    }
    lines.push('');

    const failingAudits = category.auditRefs.filter(ref => {
      const audit = report.audits[ref.id];
      return audit && audit.score !== null && audit.score < 0.9;
    });

    if (failingAudits.length === 0) {
      lines.push('All audits in this category passed (score >= 90).');
      return lines.join('\n');
    }

    lines.push('The following audits in this category have a score below 90 and may need attention:');
    for (const ref of failingAudits) {
      const audit = report.audits[ref.id];
      if (!audit) {
        continue;
      }
      const score = audit.score !== null ? Math.round(audit.score * 100) : 'n/a';
      let line = `- **${audit.title}**: ${score}`;
      if (audit.displayValue) {
        line += ` (${audit.displayValue})`;
      }
      lines.push(line);
      lines.push(`  * ${audit.description.replace(/\n/g, ' ')}`);
      if (audit.details) {
        const formattedDetails = this.#formatDetails(audit.details);
        if (formattedDetails) {
          lines.push('');
          lines.push(formattedDetails.split('\n').map(l => `    ${l}`).join('\n'));
        }
      }
    }

    return lines.join('\n');
  }

  #formatDetails(details: LHModel.ReporterTypes.DetailsJSON): string {
    switch (details.type) {
      case 'table': {
        const lines: string[] = [];
        if (details.summary) {
          const summaryParts = [];
          // Purposefully rule out 0 because we want to skip if there is 0 wasted time.
          if (details.summary.wastedMs) {
            summaryParts.push(`Wasted time: ${details.summary.wastedMs}ms`);
          }
          // Purposefully rule out 0 because we want to skip if there is 0 wasted time.
          if (details.summary.wastedBytes) {
            summaryParts.push(`Wasted bytes: ${details.summary.wastedBytes}`);
          }
          if (summaryParts.length > 0) {
            lines.push(summaryParts.join('\n'));
          }
        }
        lines.push(this.#formatTable(details.headings, details.items));
        return lines.join('\n');
      }
      case 'opportunity': {
        const lines: string[] = [];
        const summaryParts = [];
        if (details.overallSavingsMs) {
          summaryParts.push(`Potential savings: ${details.overallSavingsMs}ms`);
        }
        if (details.overallSavingsBytes) {
          summaryParts.push(`Potential savings: ${details.overallSavingsBytes} bytes`);
        }
        if (summaryParts.length > 0) {
          lines.push(summaryParts.join(', '));
        }
        lines.push(this.#formatTable(details.headings, details.items));
        return lines.join('\n');
      }
      default:
        return '';
    }
  }

  #formatTable(headings: LHModel.ReporterTypes.TableHeadingJSON[], items: Array<Record<string, unknown>>): string {
    const lines: string[] = [];
    lines.push(`| ${headings.map(h => h.label).join(' | ')} |`);
    for (const item of items) {
      const row = headings.map(h => this.#formatTableValue(item[h.key] as LHModel.ReporterTypes.TableItemValue));
      lines.push(`| ${row.join(' | ')} |`);
    }
    return lines.join('\n');
  }

  #formatTableValue(value: LHModel.ReporterTypes.TableItemValue|undefined): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object' && 'type' in value) {
      switch (value.type) {
        case 'node':
          return value.nodeLabel || value.selector || value.snippet || '(node)';
        case 'source-location': {
          const parts = [];
          if (value.url) {
            parts.push(value.url);
          }
          if (value.line) {
            parts.push(String(value.line));
          }
          if (value.column) {
            parts.push(String(value.column));
          }
          return parts.join(':');
        }
      }
    }
    return '';
  }
}
