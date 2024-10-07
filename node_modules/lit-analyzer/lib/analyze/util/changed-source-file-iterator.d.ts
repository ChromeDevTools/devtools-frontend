import { SourceFile } from "typescript";
export type ChangedSourceFileIterator = ((sourceFiles: readonly SourceFile[]) => Iterable<SourceFile>) & {
    invalidate(sourceFile: SourceFile): void;
};
/**
 * Yields source files that have changed since last time this function was called.
 */
export declare function changedSourceFileIterator(): ChangedSourceFileIterator;
//# sourceMappingURL=changed-source-file-iterator.d.ts.map