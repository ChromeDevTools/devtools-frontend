import type * as SDK from '../../core/sdk/sdk.js';
import { type Client, TimelineController } from './TimelineController.js';
export declare class UIDevtoolsController extends TimelineController {
    constructor(rootTarget: SDK.Target.Target, primaryPageTarget: SDK.Target.Target, client: Client);
}
