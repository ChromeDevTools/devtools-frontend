import '../../../../ui/components/report_view/report_view.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export declare class PreloadingDisabledInfobar extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
    #private;
    connectedCallback(): void;
    set data(data: Protocol.Preload.PreloadEnabledStateUpdatedEvent);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-preloading-disabled-infobar': PreloadingDisabledInfobar;
    }
}
