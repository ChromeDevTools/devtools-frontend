import type { CdpTarget } from '../context/cdpTarget.js';
import type { BidiPreloadScript } from './bidiPreloadScript.js';
/** BidiPreloadScripts can be filtered by BiDi ID or target ID. */
export type BidiPreloadScriptFilter = Partial<Pick<BidiPreloadScript, 'id'> & Pick<CdpTarget, 'targetId'>>;
/**
 * Container class for preload scripts.
 */
export declare class PreloadScriptStorage {
    #private;
    /** Finds all entries that match the given filter. */
    findPreloadScripts(filter?: BidiPreloadScriptFilter): BidiPreloadScript[];
    addPreloadScript(preloadScript: BidiPreloadScript): void;
    /** Deletes all BiDi preload script entries that match the given filter. */
    removeBiDiPreloadScripts(filter?: BidiPreloadScriptFilter): void;
}
