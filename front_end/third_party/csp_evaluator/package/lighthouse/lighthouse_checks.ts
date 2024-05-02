/**
 * @fileoverview CSP checks as used by Lighthouse. These checks tend to be a
 * stricter subset of the other checks defined in this project.
 */

import {CheckerFunction} from '../checks/checker';
import {checkInvalidKeyword, checkMissingSemicolon, checkUnknownDirective} from '../checks/parser_checks';
import {checkDeprecatedDirective, checkMissingObjectSrcDirective, checkMissingScriptSrcDirective, checkMultipleMissingBaseUriDirective, checkNonceLength, checkPlainUrlSchemes, checkScriptUnsafeInline, checkWildcards} from '../checks/security_checks';
import {checkAllowlistFallback, checkStrictDynamic, checkUnsafeInlineFallback} from '../checks/strictcsp_checks';
import {Csp, Directive, Version} from '../csp';
import {Finding} from '../finding';

interface Equalable {
  equals(a: unknown): boolean;
}

function arrayContains<T extends Equalable>(arr: T[], elem: T) {
  return arr.some(e => e.equals(elem));
}

/**
 * Computes the intersection of all of the given sets using the `equals(...)`
 * method to compare items.
 */
function setIntersection<T extends Equalable>(sets: T[][]): T[] {
  const intersection: T[] = [];
  if (sets.length === 0) {
    return intersection;
  }
  const firstSet = sets[0];
  for (const elem of firstSet) {
    if (sets.every(set => arrayContains(set, elem))) {
      intersection.push(elem);
    }
  }
  return intersection;
}

/**
 * Computes the union of all of the given sets using the `equals(...)` method to
 * compare items.
 */
function setUnion<T extends Equalable>(sets: T[][]): T[] {
  const union: T[] = [];
  for (const set of sets) {
    for (const elem of set) {
      if (!arrayContains(union, elem)) {
        union.push(elem);
      }
    }
  }
  return union;
}

/**
 * Checks if *any* of the given policies pass the given checker. If at least one
 * passes, returns no findings. Otherwise, returns the list of findings from the
 * first one that had any findings.
 */
function atLeastOnePasses(
    parsedCsps: Csp[], checker: CheckerFunction): Finding[] {
  const findings: Finding[][] = [];
  for (const parsedCsp of parsedCsps) {
    findings.push(checker(parsedCsp));
  }
  return setIntersection(findings);
}

/**
 * Checks if *any* of the given policies fail the given checker. Returns the
 * list of findings from the one that had the most findings.
 */
function atLeastOneFails(
    parsedCsps: Csp[], checker: CheckerFunction): Finding[] {
  const findings: Finding[][] = [];
  for (const parsedCsp of parsedCsps) {
    findings.push(checker(parsedCsp));
  }
  return setUnion(findings);
}

/**
 * Evaluate the given list of CSPs for checks that should cause Lighthouse to
 * mark the CSP as failing. Returns only the first set of failures.
 */
export function evaluateForFailure(parsedCsps: Csp[]): Finding[] {
  // Check #1
  const targetsXssFindings = [
    ...atLeastOnePasses(parsedCsps, checkMissingScriptSrcDirective),
    ...atLeastOnePasses(parsedCsps, checkMissingObjectSrcDirective),
    ...checkMultipleMissingBaseUriDirective(parsedCsps),
  ];

  // Check #2
  const effectiveCsps =
      parsedCsps.map(csp => csp.getEffectiveCsp(Version.CSP3));
  const effectiveCspsWithScript = effectiveCsps.filter(csp => {
    const directiveName = csp.getEffectiveDirective(Directive.SCRIPT_SRC);
    return csp.directives[directiveName];
  });
  const robust = [
    ...atLeastOnePasses(effectiveCspsWithScript, checkStrictDynamic),
    ...atLeastOnePasses(effectiveCspsWithScript, checkScriptUnsafeInline),
    ...atLeastOnePasses(effectiveCsps, checkWildcards),
    ...atLeastOnePasses(effectiveCsps, checkPlainUrlSchemes),
  ];
  return [...targetsXssFindings, ...robust];
}

/**
 * Evaluate the given list of CSPs for checks that should cause Lighthouse to
 * mark the CSP as OK, but present a warning. Returns only the first set of
 * failures.
 */
export function evaluateForWarnings(parsedCsps: Csp[]): Finding[] {
  // Check #1 is implemented by Lighthouse directly
  // Check #2 is no longer used in Lighthouse.

  // Check #3
  return [
    ...atLeastOneFails(parsedCsps, checkUnsafeInlineFallback),
    ...atLeastOneFails(parsedCsps, checkAllowlistFallback)
  ];
}

/**
 * Evaluate the given list of CSPs for syntax errors. Returns a list of the same
 * length as parsedCsps where each item in the list is the findings for the
 * matching Csp.
 */
export function evaluateForSyntaxErrors(parsedCsps: Csp[]): Finding[][] {
  // Check #4
  const allFindings: Finding[][] = [];
  for (const csp of parsedCsps) {
    const findings = [
      ...checkNonceLength(csp), ...checkUnknownDirective(csp),
      ...checkDeprecatedDirective(csp), ...checkMissingSemicolon(csp),
      ...checkInvalidKeyword(csp)
    ];
    allFindings.push(findings);
  }
  return allFindings;
}
