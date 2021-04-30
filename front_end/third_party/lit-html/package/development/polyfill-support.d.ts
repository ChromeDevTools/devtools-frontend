/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * lit-html patch to support browsers without native web components.
 *
 * This module should be used in addition to loading the web components
 * polyfills via @webcomponents/webcomponentjs. When using those polyfills
 * support for polyfilled Shadow DOM is automatic via the ShadyDOM polyfill.
 * Scoping classes are added to DOM nodes to facilitate CSS scoping that
 * simulates the style scoping Shadow DOM provides. ShadyDOM does this scoping
 * to all elements added to the DOM. This module provides an important
 * optimization for this process by pre-scoping lit-html template
 * DOM. This means ShadyDOM does not have to scope each instance of the
 * template DOM. Instead, each template is scoped only once.
 *
 * Creating scoped CSS is not covered by this module. It is, however, integrated
 * into the lit-element and @lit/reactive-element packages. See the ShadyCSS docs
 * for how to apply scoping to CSS:
 * https://github.com/webcomponents/polyfills/tree/master/packages/shadycss#usage.
 *
 * @packageDocumentation
 */
interface RenderOptions {
    readonly renderBefore?: ChildNode | null;
    scope?: string;
}
interface ShadyTemplateResult {
    strings: TemplateStringsArray;
    _$litType$?: string;
}
interface Directive {
    __directive?: Directive;
}
interface DirectiveParent {
    _$parent?: DirectiveParent;
    __directive?: Directive;
    __directives?: Array<Directive | undefined>;
}
interface PatchableChildPartConstructor {
    new (...args: any[]): PatchableChildPart;
}
interface PatchableChildPart {
    __directive?: Directive;
    _$committedValue: unknown;
    _$startNode: ChildNode;
    _$endNode: ChildNode | null;
    options: RenderOptions;
    _$setValue(value: unknown, directiveParent: DirectiveParent): void;
    _$getTemplate(result: ShadyTemplateResult): HTMLTemplateElement;
}
interface PatchableTemplate {
    el: HTMLTemplateElement;
}
interface PatchableTemplateConstructor {
    new (...args: any[]): PatchableTemplate;
    createElement(html: string, options?: RenderOptions): HTMLTemplateElement;
}
interface PatchableTemplateInstance {
    _$template: PatchableTemplate;
}
declare const styledScopes: Set<string>;
declare const scopeCssStore: Map<string, string[]>;
declare const ENABLE_SHADYDOM_NOPATCH = true;
//# sourceMappingURL=polyfill-support.d.ts.map