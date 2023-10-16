import { CheckerFunction } from './checks/checker';
import { Csp, Version } from './csp';
import { Finding } from './finding';
export declare class CspEvaluator {
    version: Version;
    csp: Csp;
    findings: Finding[];
    constructor(parsedCsp: Csp, cspVersion?: Version);
    evaluate(parsedCspChecks?: CheckerFunction[], effectiveCspChecks?: CheckerFunction[]): Finding[];
}
export declare const DEFAULT_CHECKS: CheckerFunction[];
export declare const STRICTCSP_CHECKS: CheckerFunction[];
//# sourceMappingURL=evaluator.d.ts.map