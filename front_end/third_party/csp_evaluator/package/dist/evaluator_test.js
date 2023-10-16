"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const csp_1 = require("./csp");
const evaluator_1 = require("./evaluator");
const finding_1 = require("./finding");
describe('Test evaluator', () => {
    it('CspEvaluator', () => {
        const fakeCsp = new csp_1.Csp();
        const evaluator = new evaluator_1.CspEvaluator(fakeCsp);
        expect(evaluator.csp).toBe(fakeCsp);
    });
    it('Evaluate', () => {
        const fakeCsp = new (csp_1.Csp)();
        const fakeFinding = new (finding_1.Finding)(finding_1.Type.UNKNOWN_DIRECTIVE, 'Fake description', finding_1.Severity.MEDIUM, 'fake-directive', 'fake-directive-value');
        const fakeVerifier = (parsedCsp) => {
            return [fakeFinding];
        };
        const evaluator = new (evaluator_1.CspEvaluator)(fakeCsp);
        const findings = evaluator.evaluate([fakeVerifier, fakeVerifier], [fakeVerifier]);
        const expectedFindings = [fakeFinding, fakeFinding, fakeFinding];
        expect(findings).toEqual(expectedFindings);
    });
});
//# sourceMappingURL=evaluator_test.js.map