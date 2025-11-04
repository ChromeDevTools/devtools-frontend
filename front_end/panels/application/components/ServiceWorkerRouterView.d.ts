import type * as SDK from '../../../core/sdk/sdk.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
export declare class ServiceWorkerRouterView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    update(rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[]): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-service-worker-router-view': ServiceWorkerRouterView;
    }
}
