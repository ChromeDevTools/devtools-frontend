import { Options as ParserOptions } from './parser/index';
import descriptionTokenizer from './parser/tokenizers/description';
import nameTokenizer from './parser/tokenizers/name';
import tagTokenizer from './parser/tokenizers/tag';
import typeTokenizer from './parser/tokenizers/type';
import alignTransform from './transforms/align';
import indentTransform from './transforms/indent';
import crlfTransform from './transforms/crlf';
import { flow as flowTransform } from './transforms/index';
import { rewireSpecs, rewireSource, seedBlock, seedTokens } from './util';
export * from './primitives';
export declare function parse(source: string, options?: Partial<ParserOptions>): import("./primitives").Block[];
export declare const stringify: import("./stringifier/index").Stringifier;
export { default as inspect } from './stringifier/inspect';
export declare const transforms: {
    flow: typeof flowTransform;
    align: typeof alignTransform;
    indent: typeof indentTransform;
    crlf: typeof crlfTransform;
};
export declare const tokenizers: {
    tag: typeof tagTokenizer;
    type: typeof typeTokenizer;
    name: typeof nameTokenizer;
    description: typeof descriptionTokenizer;
};
export declare const util: {
    rewireSpecs: typeof rewireSpecs;
    rewireSource: typeof rewireSource;
    seedBlock: typeof seedBlock;
    seedTokens: typeof seedTokens;
};
