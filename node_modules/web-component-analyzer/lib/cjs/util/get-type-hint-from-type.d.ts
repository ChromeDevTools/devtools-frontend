import { SimpleType } from "ts-simple-type";
import { Type, TypeChecker } from "typescript";
import { TransformerConfig } from "../transformers/transformer-config";
/**
 * Returns a "type hint" from a type
 * The type hint is an easy to read representation of the type and is not made for being parsed.
 * @param type
 * @param checker
 * @param config
 */
export declare function getTypeHintFromType(type: string | Type | SimpleType | undefined, checker: TypeChecker, config: TransformerConfig): string | undefined;
//# sourceMappingURL=get-type-hint-from-type.d.ts.map