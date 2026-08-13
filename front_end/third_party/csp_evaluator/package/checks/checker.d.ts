/**
 * @fileoverview Shared interfaces for functions that check CSP policies.
 */
import { Csp } from '../csp.js';
import { Finding } from '../finding.js';
/**
 * A function that checks a given Csp for problems and returns an unordered
 * list of Findings.
 */
export type CheckerFunction = (csp: Csp) => Finding[];
