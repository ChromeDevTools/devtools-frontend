import type { ParsletFunction } from './Parslet.js';
import type { Grammar } from '../grammars/Grammar.js';
export declare function createNamePathParslet({ allowSquareBracketsOnAnyType, allowJsdocNamePaths, pathGrammar }: {
    allowJsdocNamePaths: boolean;
    allowSquareBracketsOnAnyType: boolean;
    pathGrammar: Grammar | null;
}): ParsletFunction;
