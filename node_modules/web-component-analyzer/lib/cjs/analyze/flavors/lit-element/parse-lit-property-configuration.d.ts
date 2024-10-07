import { SimpleType } from "ts-simple-type";
import * as tsModule from "typescript";
import { CallExpression, Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { LitElementPropertyConfig } from "../../types/features/lit-element-property-config";
export type LitElementPropertyDecoratorKind = "property" | "internalProperty" | "state";
export declare const LIT_ELEMENT_PROPERTY_DECORATOR_KINDS: LitElementPropertyDecoratorKind[];
/**
 * Returns a potential lit element property decorator.
 * @param node
 * @param context
 */
export declare function getLitElementPropertyDecorator(node: Node, context: AnalyzerVisitContext): {
    expression: CallExpression;
    kind: LitElementPropertyDecoratorKind;
} | undefined;
/**
 * Returns a potential lit property decorator configuration.
 * @param node
 * @param context
 */
export declare function getLitElementPropertyDecoratorConfig(node: Node, context: AnalyzerVisitContext): undefined | LitElementPropertyConfig;
/**
 * Computes the correct type for a given node for use in lit property
 * configuration.
 * @param ts
 * @param node
 */
export declare function getLitPropertyType(ts: typeof tsModule, node: Node): SimpleType | string;
/**
 * Parses an object literal expression and returns a lit property configuration.
 * @param node
 * @param existingConfig
 * @param context
 */
export declare function getLitPropertyOptions(node: Node, object: unknown, context: AnalyzerVisitContext, existingConfig?: LitElementPropertyConfig): LitElementPropertyConfig;
//# sourceMappingURL=parse-lit-property-configuration.d.ts.map