import { Input } from '../../../protocol/protocol.js';
import type { EmptyResult } from '../../../protocol/webdriver-bidi';
import type { BrowsingContextStorage } from '../context/browsingContextStorage.js';
export declare class InputProcessor {
    #private;
    private constructor();
    static create(browsingContextStorage: BrowsingContextStorage): InputProcessor;
    performActions(params: Input.PerformActionsParameters): Promise<EmptyResult>;
    releaseActions(params: Input.ReleaseActionsParameters): Promise<EmptyResult>;
}
