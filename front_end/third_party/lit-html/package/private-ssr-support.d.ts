/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/// <reference types="trusted-types" />
import { Directive, PartInfo } from './directive.js';
import { AttributePart, Part } from './lit-html.js';
export type { Template } from './lit-html.js';
/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports mangled in the
 * client side code, we export a _Σ object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 * @private
 */
export declare const _Σ: {
    boundAttributeSuffix: string;
    marker: string;
    markerMatch: string;
    HTML_RESULT: number;
    getTemplateHtml: (strings: TemplateStringsArray, type: 1 | 2) => [TrustedHTML, (string | undefined)[]];
    overrideDirectiveResolve: (directiveClass: new (part: PartInfo) => Directive & {
        render(): unknown;
    }, resolveOverrideFn: (directive: Directive, values: unknown[]) => unknown) => {
        new (part: PartInfo): {
            _$resolve(this: Directive, _part: Part, values: unknown[]): unknown;
            __part: Part;
            __attributeIndex: number | undefined;
            __directive?: Directive | undefined;
            _$parent: import("./lit-html.js").Disconnectable;
            _$disconnetableChildren?: Set<import("./lit-html.js").Disconnectable> | undefined;
            _$setDirectiveConnected?(isConnected: boolean): void;
            _$initialize(part: Part, parent: import("./lit-html.js").Disconnectable, attributeIndex: number | undefined): void;
            render: ((...props: unknown[]) => unknown) & (() => unknown);
            update(_part: Part, props: unknown[]): unknown;
        };
    };
    getAttributePartCommittedValue: (part: AttributePart, value: unknown, index: number | undefined) => unknown;
    resolveDirective: (part: import("./lit-html.js").ChildPart | AttributePart | import("./lit-html.js").ElementPart, value: unknown, parent?: import("./lit-html.js").DirectiveParent, attributeIndex?: number | undefined) => unknown;
    AttributePart: typeof AttributePart;
    PropertyPart: typeof import("./lit-html.js").PropertyPart;
    BooleanAttributePart: typeof import("./lit-html.js").BooleanAttributePart;
    EventPart: typeof import("./lit-html.js").EventPart;
    ElementPart: typeof import("./lit-html.js").ElementPart;
};
//# sourceMappingURL=private-ssr-support.d.ts.map