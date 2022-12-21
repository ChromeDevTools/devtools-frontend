import getParser, { Options as ParserOptions } from './parser/index';
import descriptionTokenizer from './parser/tokenizers/description';
import nameTokenizer from './parser/tokenizers/name';
import tagTokenizer from './parser/tokenizers/tag';
import typeTokenizer from './parser/tokenizers/type';
import getStringifier from './stringifier/index';
import alignTransform from './transforms/align';
import indentTransform from './transforms/indent';
import crlfTransform from './transforms/crlf';
import { flow as flowTransform } from './transforms/index';
import { rewireSpecs, rewireSource, seedBlock, seedTokens } from './util';

export * from './primitives';

export function parse(source: string, options: Partial<ParserOptions> = {}) {
  return getParser(options)(source);
}

export const stringify = getStringifier();
export { default as inspect } from './stringifier/inspect';

export const transforms = {
  flow: flowTransform,
  align: alignTransform,
  indent: indentTransform,
  crlf: crlfTransform,
};

export const tokenizers = {
  tag: tagTokenizer,
  type: typeTokenizer,
  name: nameTokenizer,
  description: descriptionTokenizer,
};

export const util = { rewireSpecs, rewireSource, seedBlock, seedTokens };
