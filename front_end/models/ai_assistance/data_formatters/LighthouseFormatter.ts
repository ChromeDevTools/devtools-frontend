// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as LHModel from '../../lighthouse/lighthouse.js';

import {bytes, millis} from './UnitFormatters.js';

// Mirrors `Util.PASS_THRESHOLD` in `front_end/third_party/lighthouse/report/bundle.js`
// (defined in Lighthouse's `report/renderer/util.js`). The pre-built report bundle does
// not export `Util`, so this threshold is defined locally.
const PASS_THRESHOLD = 0.9;

/**
 * Category argument for Lighthouse tools, accepting a specific category ID or `'all'`
 * to target a full report across all standard categories.
 */
export type LighthouseCategoryArg = 'all'|LHModel.RunTypes.CategoryId;

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
    if (report.gatherMode) {
      lines.push(`Mode: ${report.gatherMode}`);
    }
    lines.push('');
    lines.push('## Category Scores');
    for (const category of Object.values(report.categories)) {
      lines.push(`- ${category.title}: ${this.#formatCategoryScore(report, category)}`);
    }
    return lines.join('\n');
  }

  #formatCategoryScore(report: LHModel.ReporterTypes.ReportJSON, category: LHModel.ReporterTypes.CategoryJSON): string
      |number {
    if (this.#shouldDisplayAsFraction(report, category)) {
      const {numPassed, numPassableAudits} = this.#calculateCategoryFraction(report, category);
      return `${numPassed}/${numPassableAudits} audits passed`;
    }
    return category.score !== null ? Math.round(category.score * 100) : 'n/a';
  }

  /**
   * Mirrors `Util.shouldDisplayAsFraction` in the Lighthouse report renderer (`bundle.js`).
   */
  #shouldDisplayAsFraction(report: LHModel.ReporterTypes.ReportJSON,
                           category: LHModel.ReporterTypes.CategoryJSON): boolean {
    return report.gatherMode === 'timespan' || report.gatherMode === 'snapshot' ||
        category.categoryScoreDisplayMode === 'fraction';
  }

  /**
   * Mirrors `Util.calculateCategoryFraction` in the Lighthouse report renderer (`bundle.js`).
   */
  #calculateCategoryFraction(report: LHModel.ReporterTypes.ReportJSON, category: LHModel.ReporterTypes.CategoryJSON): {
    numPassed: number,
    numPassableAudits: number,
  } {
    let numPassableAudits = 0;
    let numPassed = 0;
    for (const ref of category.auditRefs) {
      const audit = report.audits[ref.id];
      if (!audit) {
        continue;
      }
      const auditPassed = this.#showAsPassed(audit);
      if (ref.group === 'hidden' || audit.scoreDisplayMode === 'manual' || audit.scoreDisplayMode === 'notApplicable' ||
          audit.scoreDisplayMode === 'informative') {
        continue;
      }
      numPassableAudits += 1;
      if (auditPassed) {
        numPassed += 1;
      }
    }
    return {numPassed, numPassableAudits};
  }

  /**
   * Mirrors `Util.showAsPassed` in the Lighthouse report renderer (`bundle.js`).
   */
  #showAsPassed(audit: LHModel.ReporterTypes.AuditResultJSON): boolean {
    switch (audit.scoreDisplayMode) {
      case 'manual':
      case 'notApplicable':
        return true;
      case 'error':
      case 'informative':
        return false;
      case 'numeric':
      case 'binary':
      default:
        return Number(audit.score) >= PASS_THRESHOLD;
    }
  }

  /**
   * Returns the title and score of every failing audit (score < 90), grouped by category.
   * Descriptions and details tables are left out to keep the prompt small. Each category
   * heading includes its category ID so the agent can request the full audit details.
   */
  failingAuditsSummary(report: LHModel.ReporterTypes.ReportJSON): string {
    const lines: string[] = [];
    lines.push('## Failing audits');
    for (const [categoryId, category] of Object.entries(report.categories)) {
      lines.push('');
      lines.push(`### ${category.title} (categoryId: "${categoryId}")`);
      const failingAudits = this.#findFailingAudits(report, category);
      const erroredAudits = this.#findErroredAudits(report, category);
      if (failingAudits.length === 0 && erroredAudits.length === 0) {
        lines.push('- No failing audits.');
        continue;
      }
      for (const audit of failingAudits) {
        lines.push(`- ${audit.title}: ${this.#formatScore(audit.score)}`);
      }
      for (const audit of erroredAudits) {
        const errorSuffix = audit.errorMessage ? ` (${this.#toSingleLine(audit.errorMessage)})` : '';
        lines.push(`- ${audit.title}: Error${errorSuffix}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Formats a Lighthouse report for an AI Agent. If categoryId is 'all', returns
   * each category's audits. Otherwise, returns audits for the specified category.
   * The output does not include the report summary, because the conversation
   * context already sends it.
   */
  formatReport(report: LHModel.ReporterTypes.ReportJSON, categoryId: LighthouseCategoryArg): string {
    if (categoryId === 'all') {
      return Object.values(report.categories).map(category => this.audits(report, category)).join('\n\n');
    }
    return this.audits(report, categoryId);
  }

  /**
   * Returns a markdown list of all audits in a given category.
   * Highlight failing audits (score < 90).
   */
  audits(report: LHModel.ReporterTypes.ReportJSON,
         categoryOrId: LHModel.RunTypes.CategoryId|LHModel.ReporterTypes.CategoryJSON): string {
    const category = typeof categoryOrId === 'string' ? report.categories[categoryOrId] : categoryOrId;
    if (!category) {
      return `Category "${categoryOrId}" not found.`;
    }

    const lines: string[] = [];
    lines.push(`# Audits for ${category.title}`);
    if (category.description) {
      lines.push(this.#toSingleLine(category.description));
    }
    lines.push('');

    const failingAudits = this.#findFailingAudits(report, category);
    const erroredAudits = this.#findErroredAudits(report, category);

    if (failingAudits.length === 0 && erroredAudits.length === 0) {
      lines.push('All audits in this category passed (score >= 90).');
      return lines.join('\n');
    }

    const sections: string[] = [];

    if (failingAudits.length > 0) {
      const sectionLines = ['The following audits in this category have a score below 90 and may need attention:'];
      for (const audit of failingAudits) {
        sectionLines.push(...this.#formatAudit(audit, this.#formatScore(audit.score)));
      }
      sections.push(sectionLines.join('\n'));
    }

    if (erroredAudits.length > 0) {
      const sectionLines = ['The following audits in this category errored:'];
      for (const audit of erroredAudits) {
        sectionLines.push(...this.#formatAudit(audit, 'Error'));
      }
      sections.push(sectionLines.join('\n'));
    }

    lines.push(sections.join('\n\n'));
    return lines.join('\n');
  }

  #formatAudit(audit: LHModel.ReporterTypes.AuditResultJSON, score: string|number): string[] {
    const lines: string[] = [];
    let line = `- **${audit.title}**: ${score}`;
    if (audit.displayValue) {
      line += ` (${audit.displayValue})`;
    }
    lines.push(line);
    lines.push(`  * ${this.#toSingleLine(audit.description)}`);
    if (audit.scoreDisplayMode === 'error' && audit.errorMessage) {
      lines.push(`  * Error: ${this.#toSingleLine(audit.errorMessage)}`);
    }
    if (audit.explanation) {
      lines.push(`  * Explanation: ${this.#joinExplanationLines(audit.explanation)}`);
    }
    if (audit.warnings) {
      for (const warning of audit.warnings) {
        lines.push(`  * Warning: ${this.#toSingleLine(warning)}`);
      }
    }
    if (audit.details) {
      const formattedDetails = this.#formatDetails(audit.details);
      if (formattedDetails) {
        lines.push('');
        lines.push(formattedDetails.split('\n').map(l => l ? `    ${l}` : '').join('\n'));
      }
    }
    return lines;
  }

  /**
   * Returns the non-hidden audits in a category that scored below 90, in the category's order.
   * Audits without a score (such as informative or manual audits) cannot fail, so they
   * are excluded.
   */
  #findFailingAudits(report: LHModel.ReporterTypes.ReportJSON, category: LHModel.ReporterTypes.CategoryJSON):
      Array<LHModel.ReporterTypes.AuditResultJSON&{score: number}> {
    return category.auditRefs.filter(ref => ref.group !== 'hidden')
        .map(ref => report.audits[ref.id])
        .filter((audit): audit is LHModel.ReporterTypes.AuditResultJSON&{score: number} => Boolean(audit) &&
                    audit.scoreDisplayMode !== 'error' && audit.score !== null && audit.score < PASS_THRESHOLD);
  }

  /**
   * Returns the non-hidden audits in a category that failed with an execution error
   * (`scoreDisplayMode === 'error'`), in the category's order.
   */
  #findErroredAudits(report: LHModel.ReporterTypes.ReportJSON,
                     category: LHModel.ReporterTypes.CategoryJSON): LHModel.ReporterTypes.AuditResultJSON[] {
    return category.auditRefs.filter(ref => ref.group !== 'hidden')
        .map(ref => report.audits[ref.id])
        .filter((audit): audit is LHModel.ReporterTypes.AuditResultJSON =>
                    Boolean(audit) && audit.scoreDisplayMode === 'error');
  }

  #formatScore(score: number): number {
    return Math.round(score * 100);
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
      case 'list':
        return this.#formatList(details);
      case 'checklist':
        return Object.values(details.items)
            .map(item => `- ${this.#toSingleLine(item.label)}: ${item.value ? 'Passed' : 'Failed'}`)
            .join('\n');
      case 'network-tree':
        return this.#formatNetworkTree(details);
      default:
        return '';
    }
  }

  #formatNetworkTree(details: LHModel.ReporterTypes.NetworkTreeDetailsJSON): string {
    if (Object.keys(details.chains).length === 0) {
      return '';
    }
    const lines = [`Maximum critical path latency: ${millis(details.longestChain.duration)}`];
    lines.push(...this.#formatNetworkTreeNodes(details.chains, 0));
    return lines.join('\n');
  }

  #formatNetworkTreeNodes(nodes: Record<string, LHModel.ReporterTypes.NetworkTreeNodeJSON>, depth: number): string[] {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    for (const node of Object.values(nodes)) {
      const longestSuffix = node.isLongest ? ' (longest chain)' : '';
      lines.push(
          `${indent}- ${node.url} (${millis(node.navStartToEndTime)}, ${bytes(node.transferSize)})${longestSuffix}`);
      if (node.children) {
        lines.push(...this.#formatNetworkTreeNodes(node.children, depth + 1));
      }
    }
    return lines;
  }

  #formatList(details: LHModel.ReporterTypes.ListDetailsJSON): string {
    const itemStrings: string[] = [];
    for (const item of details.items) {
      if (item.type === 'list-section') {
        const sectionLines: string[] = [];
        if (item.title) {
          sectionLines.push(`**${this.#toSingleLine(item.title)}**`);
        }
        if (item.description) {
          sectionLines.push(this.#toSingleLine(item.description));
        }
        const formattedValue = this.#formatListValue(item.value);
        if (formattedValue) {
          sectionLines.push(formattedValue);
        }
        if (sectionLines.length > 0) {
          itemStrings.push(sectionLines.join('\n'));
        }
      } else {
        const formattedItem = this.#formatListValue(item);
        if (formattedItem) {
          itemStrings.push(formattedItem);
        }
      }
    }
    return itemStrings.join('\n\n');
  }

  #formatListValue(value: LHModel.ReporterTypes.ListItemValueJSON): string {
    switch (value.type) {
      case 'node':
        return this.#formatNodeFields(value)
            .map(({labelSuffix, value: v}) => {
              const label = labelSuffix ? `Element ${labelSuffix}` : 'Element';
              return `- **${label}**: ${this.#toSingleLine(v)}`;
            })
            .join('\n');
      case 'text':
      case 'url':
        return this.#toSingleLine(value.value);
      default:
        return this.#formatDetails(value);
    }
  }

  #formatNodeFields(value: LHModel.ReporterTypes.NodeDetailsJSON): Array<{
    value: string,
    labelSuffix?: string,
  }> {
    const results = [];
    const label = value.nodeLabel || value.selector || value.snippet || '(node)';
    results.push({value: label});
    if (value.selector && value.selector !== label) {
      results.push({labelSuffix: 'selector', value: value.selector});
    }
    if (value.path) {
      results.push({labelSuffix: 'path', value: value.path});
    }
    if (value.explanation) {
      results.push({labelSuffix: 'explanation', value: this.#joinExplanationLines(value.explanation)});
    }
    return results;
  }

  #formatTable(headings: LHModel.ReporterTypes.TableHeadingJSON[], items: LHModel.ReporterTypes.TableItem[]): string {
    const lines: string[] = [];

    for (const item of items) {
      const itemLines: string[] = [];
      for (const heading of headings) {
        const value = item[heading.key] as LHModel.ReporterTypes.TableItemValue;
        const formattedValues = this.#formatTableValues(value, heading.valueType);
        for (const {labelSuffix, value: v} of formattedValues) {
          const baseLabel = heading.label || heading.key;
          const label = labelSuffix ? `${baseLabel} ${labelSuffix}` : baseLabel;
          itemLines.push(`  * **${label}**: ${this.#toSingleLine(v)}`);
        }
        const subItems = item.subItems;
        // subItems can technically be a string (TableItemValue), but we
        // only care about it here if it's a SubItemsJSON (type:
        // 'subitems'), which represents a nested table of values.
        if (subItems && typeof subItems === 'object' && 'type' in subItems && subItems.type === 'subitems' &&
            heading.subItemsHeading) {
          for (const subItem of subItems.items) {
            const subValue = subItem[heading.subItemsHeading.key] as LHModel.ReporterTypes.TableItemValue;
            // Skip sub-item values that are identical to the main item's value
            // for the same heading to avoid redundant output (e.g. if both
            // show the same "Est Savings" value).
            if (subValue === value) {
              continue;
            }
            const formattedSubValues = this.#formatTableValues(subValue, heading.subItemsHeading.valueType);
            for (const {value: v} of formattedSubValues) {
              itemLines.push(`    * ${this.#toSingleLine(v)}`);
            }
          }
        }
      }
      if (itemLines.length > 0) {
        lines.push(`- Item:`);
        lines.push(...itemLines);
      }
    }
    return lines.join('\n');
  }

  #formatTableValues(value: LHModel.ReporterTypes.TableItemValue|undefined, valueType?: string): Array<{
    value: string,
    labelSuffix?: string,
  }> {
    if (value === undefined || value === null) {
      return [];
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return [{value: this.#formatValue(value, valueType)}];
    }
    if (typeof value === 'object' && 'type' in value) {
      switch (value.type) {
        case 'node':
          return this.#formatNodeFields(value);
        case 'text':
        case 'url':
          return [{value: this.#formatValue(value.value, valueType)}];
        case 'source-location': {
          const parts = [];
          if (value.url) {
            parts.push(value.url);
          }
          // SourceLocationDetailsJSON.line is 0-based; the Lighthouse report displays 1-based line numbers.
          if (typeof value.line === 'number') {
            parts.push(String(value.line + 1));
          }
          if (typeof value.column === 'number') {
            parts.push(String(value.column));
          }
          return [{value: parts.join(':')}];
        }
      }
    }
    return [];
  }

  #toSingleLine(text: string): string {
    return text.replace(/[^\S\n]*\n\s*/g, ' ');
  }

  /**
   * Joins lines of an explanation onto a single line. Lines that follow a
   * non-colon line are separated with "; " so that list items (such as axe's
   * "Fix any of the following:\n  Item 1\n  Item 2") remain distinct.
   */
  #joinExplanationLines(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let result = '';
    for (const line of lines) {
      if (result) {
        result += result.endsWith(':') ? ' ' : '; ';
      }
      result += line;
    }
    return result;
  }

  #formatValue(value: string|number, valueType?: string): string {
    if (typeof value === 'string') {
      return value;
    }
    switch (valueType) {
      case 'bytes': {
        return bytes(value);
      }
      case 'timespanMs':
      case 'ms': {
        return millis(value);
      }
      default:
        return String(value);
    }
  }
}
