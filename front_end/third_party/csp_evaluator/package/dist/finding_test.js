"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const csp_1 = require("./csp");
const finding_1 = require("./finding");
describe('Test finding', () => {
    it('Finding', () => {
        const type = finding_1.Type.MISSING_SEMICOLON;
        const description = 'description';
        const severity = finding_1.Severity.HIGH;
        const directive = csp_1.Directive.SCRIPT_SRC;
        const value = csp_1.Keyword.NONE;
        const finding = new finding_1.Finding(type, description, severity, directive, value);
        expect(finding.type).toBe(type);
        expect(finding.description).toBe(description);
        expect(finding.severity).toBe(severity);
        expect(finding.directive).toBe(directive);
        expect(finding.value).toBe(value);
    });
    it('GetHighestSeverity', () => {
        const finding1 = new finding_1.Finding(finding_1.Type.MISSING_SEMICOLON, 'description', finding_1.Severity.HIGH, csp_1.Directive.SCRIPT_SRC);
        const finding2 = new finding_1.Finding(finding_1.Type.MISSING_SEMICOLON, 'description', finding_1.Severity.MEDIUM, csp_1.Directive.SCRIPT_SRC);
        const finding3 = new finding_1.Finding(finding_1.Type.MISSING_SEMICOLON, 'description', finding_1.Severity.INFO, csp_1.Directive.SCRIPT_SRC);
        expect(finding_1.Finding.getHighestSeverity([
            finding1, finding3, finding2, finding1
        ])).toBe(finding_1.Severity.HIGH);
        expect(finding_1.Finding.getHighestSeverity([
            finding3, finding2
        ])).toBe(finding_1.Severity.MEDIUM);
        expect(finding_1.Finding.getHighestSeverity([
            finding3, finding3
        ])).toBe(finding_1.Severity.INFO);
        expect(finding_1.Finding.getHighestSeverity([])).toBe(finding_1.Severity.NONE);
    });
});
//# sourceMappingURL=finding_test.js.map