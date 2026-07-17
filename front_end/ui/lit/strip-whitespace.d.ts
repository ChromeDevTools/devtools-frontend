import * as Lit from '../../third_party/lit/lit.js';
export declare function isLitDirective(value: unknown): value is {
    values: unknown[];
};
export declare function html(strings: TemplateStringsArray, ...values: unknown[]): Lit.TemplateResult;
