/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
export type CSSSelector = string;
export interface PPseudoSelector {
    name: string;
    value: string;
}
export declare const enum PCombinator {
    Descendent = ">>>",
    Child = ">>>>"
}
export type CompoundPSelector = Array<CSSSelector | PPseudoSelector>;
export type ComplexPSelector = Array<CompoundPSelector | PCombinator>;
export type ComplexPSelectorList = ComplexPSelector[];
export declare function parsePSelectors(selector: string): [selector: ComplexPSelectorList, isPureCSS: boolean];
//# sourceMappingURL=PSelectorParser.d.ts.map