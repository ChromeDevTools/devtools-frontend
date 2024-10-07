import { ComponentDeclaration } from "../analyze/types/component-declaration";
export interface Example {
    lang?: string;
    code: string;
    description?: string;
}
/**
 * Parses and returns examples for a component.
 * @param declaration
 */
export declare function getExamplesFromComponent(declaration: ComponentDeclaration): Example[];
//# sourceMappingURL=get-examples-from-component.d.ts.map