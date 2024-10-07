import { ComponentDeclaration, ComponentHeritageClause } from "../types/component-declaration";
/**
 * Returns the superclass heritage clause
 * @param declaration
 */
export declare function getSuperclassHeritageClause(declaration: ComponentDeclaration): ComponentHeritageClause | undefined;
/**
 * Returns mixin heritage clauses for the declaration
 * @param declaration
 */
export declare function getMixinHeritageClauses(declaration: ComponentDeclaration): ComponentHeritageClause[];
/**
 * Returns all extends heritage clauses for the declaration
 * @param declaration
 */
export declare function getExtendsHeritageClauses(declaration: ComponentDeclaration): ComponentHeritageClause[];
/**
 * Returns mixin heritage clauses for the declaration and all inherited declarations
 * @param declaration
 */
export declare function getMixinHeritageClausesInChain(declaration: ComponentDeclaration): ComponentHeritageClause[];
/**
 * Returns extends heritage clauses for the declaration and all inherited declarations
 * @param declaration
 */
export declare function getExtendsHeritageClausesInChain(declaration: ComponentDeclaration): ComponentHeritageClause[];
/**
 * A helper function that makes it possible to visit all heritage clauses in the inheritance chain.
 * @param declaration
 * @param emit
 */
export declare function visitAllHeritageClauses(declaration: ComponentDeclaration, emit: (clause: ComponentHeritageClause) => void): void;
//# sourceMappingURL=component-declaration-util.d.ts.map