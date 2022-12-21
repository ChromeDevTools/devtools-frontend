import { Block, BlockMarkers } from '../primitives';
import { Tokenizer } from './tokenizers/index';
export interface Options {
    startLine: number;
    fence: string;
    spacing: 'compact' | 'preserve';
    markers: BlockMarkers;
    tokenizers: Tokenizer[];
}
export declare type Parser = (source: string) => Block[];
export default function getParser({ startLine, fence, spacing, markers, tokenizers, }?: Partial<Options>): Parser;
