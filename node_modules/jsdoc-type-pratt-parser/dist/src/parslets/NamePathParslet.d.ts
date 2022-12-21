import { ParsletFunction } from './Parslet';
import { Grammar } from '../grammars/Grammar';
export declare function createNamePathParslet({ allowJsdocNamePaths, pathGrammar }: {
    allowJsdocNamePaths: boolean;
    pathGrammar: Grammar | null;
}): ParsletFunction;
