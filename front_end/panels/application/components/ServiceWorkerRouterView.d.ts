import type * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface ViewInterface {
    rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[];
}
type View = (input: ViewInterface, output: undefined, target: HTMLElement) => void;
export declare class ServiceWorkerRouterView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set rules(rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[]);
    get rules(): SDK.ServiceWorkerManager.ServiceWorkerRouterRule[];
    performUpdate(): void;
}
export {};
