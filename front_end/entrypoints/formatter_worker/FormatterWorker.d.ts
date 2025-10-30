import { type FormatResult } from './FormatterActions.js';
import { substituteExpression } from './Substitute.js';
export interface Chunk {
    chunk: any[];
    isLastChunk: boolean;
}
export type ChunkCallback = (arg0: Chunk) => void;
export declare function createTokenizer(mimeType: string): (arg0: string, arg1: (arg0: string, arg1: string | null, arg2: number, arg3: number) => (Object | undefined | void)) => void;
export declare const AbortTokenization: {};
export declare function format(mimeType: string, text: string, indentString?: string): FormatResult;
export { substituteExpression };
