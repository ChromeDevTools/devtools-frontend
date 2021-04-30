/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { Directive, PartInfo } from '../directive.js';
import { noChange , nothing, TemplateResult} from '../lit-html.js';

export declare class UnsafeHTMLDirective extends Directive {
    static directiveName: string;
    static resultType: number;
    private _value;
    private _templateResult?;
    constructor(partInfo: PartInfo);
    render(value: string | typeof nothing | typeof noChange): typeof noChange | typeof nothing | TemplateResult<1 | 2> | undefined;
}
/**
 * Renders the result as HTML, rather than text.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
export declare const unsafeHTML: (value: string | typeof noChange | typeof nothing) => import("../directive.js").DirectiveResult<typeof UnsafeHTMLDirective>;
//# sourceMappingURL=unsafe-html.d.ts.map