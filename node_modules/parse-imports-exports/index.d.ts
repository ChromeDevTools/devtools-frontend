import type { ImportsExports, Options } from './types';
/**
 * Parses `import`/`export` in ECMAScript/TypeScript syntax.
 */
export declare const parseImportsExports: (source: string, options?: Options) => ImportsExports;
export type { ImportsExports, Options };
export type { Kind, LineColumn, Name, Path, Position, With } from './types';
