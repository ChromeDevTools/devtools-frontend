import * as tsModule from "typescript";
import tsServerModule from "typescript/lib/tsserverlibrary.js";
import { Program, SourceFile } from "typescript";
interface IVisitDependenciesContext {
    program: Program;
    ts: typeof tsModule;
    project: tsServerModule.server.Project | undefined;
    directImportCache: WeakMap<SourceFile, Set<SourceFile>>;
    emitIndirectImport(file: SourceFile, importedFrom?: SourceFile): boolean;
    emitDirectImport?(file: SourceFile): void;
    depth?: number;
    maxExternalDepth?: number;
    maxInternalDepth?: number;
}
/**
 * Visits all indirect imports from a source file
 * Emits them using "emitIndirectImport" callback
 * @param sourceFile
 * @param context
 */
export declare function visitIndirectImportsFromSourceFile(sourceFile: SourceFile, context: IVisitDependenciesContext): void;
/**
 * Returns whether a SourceFile is a Facade Module.
 * A Facade Module only consists of import and export declarations.
 * @param sourceFile
 * @param ts
 */
export declare function isFacadeModule(sourceFile: SourceFile, ts: typeof tsModule): boolean;
export {};
//# sourceMappingURL=visit-dependencies.d.ts.map