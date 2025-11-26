import '../../../ui/components/report_view/report_view.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import { type LitTemplate, type TemplateResult } from '../../../ui/lit/lit.js';
export declare class StorageMetadataView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    setStorageKey(storageKey: string): void;
    setStorageBucket(storageBucket: Protocol.Storage.StorageBucketInfo): void;
    setShowOnlyBucket(show: boolean): void;
    enableStorageBucketControls(model: SDK.StorageBucketsModel.StorageBucketsModel): void;
    render(): Promise<void>;
    getTitle(): string | undefined;
    key(content: string | TemplateResult): TemplateResult;
    value(content: string | TemplateResult): TemplateResult;
    renderReportContent(): Promise<LitTemplate>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-storage-metadata-view': StorageMetadataView;
    }
}
