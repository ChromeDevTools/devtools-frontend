import '../../../ui/components/report_view/report_view.js';
import '../../../ui/kit/kit.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../../ui/lit/lit.js';
import storageMetadataViewStyle from './storageMetadataView.css.js';
export { storageMetadataViewStyle };
export declare class StorageBucketRevealInfo {
    bucketInfo: Protocol.Storage.StorageBucketInfo;
    constructor(bucketInfo: Protocol.Storage.StorageBucketInfo);
}
export declare function renderStorageMetadataReportContent(storageKey: SDK.StorageKeyManager.StorageKey | null, storageBucket: Protocol.Storage.StorageBucketInfo | null, showOnlyBucket?: boolean): LitTemplate;
export interface ViewInput {
    title: string;
    storageKey: SDK.StorageKeyManager.StorageKey | null;
    storageBucket: Protocol.Storage.StorageBucketInfo | null;
    showOnlyBucket: boolean;
    showBucketControls: boolean;
    onDeleteBucket: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class StorageMetadataView extends UI.Widget.Widget<ShadowRoot> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    get shadowRoot(): ShadowRoot | null;
    set storageKey(storageKey: string | undefined);
    set storageBucket(storageBucket: Protocol.Storage.StorageBucketInfo | null | undefined);
    set showOnlyBucket(show: boolean);
    enableStorageBucketControls(model: SDK.StorageBucketsModel.StorageBucketsModel): void;
    performUpdate(): void;
    getTitle(): string | undefined;
}
