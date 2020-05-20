/* tslint:disable */
/* eslint-disable */
import { SourceMapEntry } from '../../SourceMap.js';

/**
*/
export class Resolver {
  free(): void;
/**
* @param {Uint8Array} src 
*/
  constructor(src: Uint8Array);
/**
* @returns {Array<any>} 
*/
  listFiles(): Array<any>;
/**
* @returns {Array<any>} 
*/
  listMappings(): Array<any>;
/**
* @param {number} addr 
* @returns {SourceMapEntry | undefined} 
*/
  resolve(addr: number): SourceMapEntry | undefined;
/**
* @param {string} file 
* @param {number} line 
* @param {number} column 
* @returns {SourceMapEntry | undefined} 
*/
  resolveReverse(file: string, line: number, column: number): SourceMapEntry | undefined;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_resolver_free: (a: number) => void;
  readonly resolver_from_slice: (a: number, b: number) => number;
  readonly resolver_listFiles: (a: number) => number;
  readonly resolver_listMappings: (a: number) => number;
  readonly resolver_resolve: (a: number, b: number) => number;
  readonly resolver_resolveReverse: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        