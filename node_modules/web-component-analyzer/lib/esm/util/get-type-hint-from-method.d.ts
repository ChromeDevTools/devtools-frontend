import { TypeChecker } from "typescript";
import { ComponentMethod } from "../analyze/types/features/component-method";
/**
 * This method returns a "type hint" that represents the method signature
 * The resulting type takes jsdoc into account.
 * I couldn't find a way for Typescript to return the signature string taking jsdoc into account
 *   so therefore I had to do some regex-magic in this method.
 */
export declare function getTypeHintFromMethod(method: ComponentMethod, checker: TypeChecker): string | undefined;
//# sourceMappingURL=get-type-hint-from-method.d.ts.map