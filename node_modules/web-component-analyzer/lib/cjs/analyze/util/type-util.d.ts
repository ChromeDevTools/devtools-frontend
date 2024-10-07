import { SimpleType } from "ts-simple-type";
import * as tsModule from "typescript";
import { Program } from "typescript";
/**
 * Relax the type so that for example "string literal" become "string" and "function" become "any"
 * This is used for javascript files to provide type checking with Typescript type inferring
 * @param type
 */
export declare function relaxType(type: SimpleType): SimpleType;
/**
 * Return a Typescript library type with a specific name
 * @param name
 * @param ts
 * @param program
 */
export declare function getLibTypeWithName(name: string, { ts, program }: {
    program: Program;
    ts: typeof tsModule;
}): SimpleType | undefined;
//# sourceMappingURL=type-util.d.ts.map