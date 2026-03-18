// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * A formatter that takes a raw Lighthouse report JSON and creates a markdown
 * summary for an AI Agent.
 */
export class LighthouseFormatter {
    /**
     * Returns an overall summary and high-level overview of the Lighthouse report.
     */
    summary(report) {
        const lines = [];
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
    audits(report, categoryId) {
        const category = report.categories[categoryId];
        if (!category) {
            return `Category "${categoryId}" not found.`;
        }
        const lines = [];
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
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=LighthouseFormatter.js.map