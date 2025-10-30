export declare function platform(): string;
export declare function isMac(): boolean;
export declare function isWin(): boolean;
/**
 * In Chrome Layout tests the imported 'Platform' object is not writable/
 * configurable, which prevents us from monkey-patching 'Platform''s methods.
 * We circumvent this by adding 'setPlatformForTests'.
 **/
export declare function setPlatformForTests(platform: string): void;
export declare function isCustomDevtoolsFrontend(): boolean;
export declare function fontFamily(): string;
