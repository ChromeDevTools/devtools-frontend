import { Transform } from './index';
import { Block, Line } from '../primitives';
import { rewireSource } from '../util';

const order = [
  'end',
  'description',
  'postType',
  'type',
  'postName',
  'name',
  'postTag',
  'tag',
  'postDelimiter',
  'delimiter',
  'start',
];

export type Ending = 'LF' | 'CRLF';

export default function crlf(ending: Ending): Transform {
  function update(line: Line): Line {
    return {
      ...line,
      tokens: { ...line.tokens, lineEnd: ending === 'LF' ? '' : '\r' },
    };
  }

  return ({ source, ...fields }: Block): Block =>
    rewireSource({ ...fields, source: source.map(update) });
}
