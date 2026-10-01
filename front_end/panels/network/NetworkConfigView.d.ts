import '../settings/emulation/components/components.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as EmulationComponents from '../settings/emulation/components/components.js';
export interface NetworkConfigViewInput {
    disableCache: boolean;
    onDisableCacheChange: (checked: boolean) => void;
    useCustomUA: boolean;
    onAutoCheckboxChange: (checked: boolean) => void;
    customSelectValue: string;
    onUserAgentSelect: (value: string) => void;
    customUserAgent: string;
    onCustomUserAgentInput: (value: string) => void;
    validationError: string;
    clientHintsValue: EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData;
    clientHintsStatusText: string;
    onClientHintsChange: (metaData?: Protocol.Emulation.UserAgentMetadata) => void;
    onClientHintsSubmit: (metaData: Protocol.Emulation.UserAgentMetadata) => void;
}
export interface NetworkConfigViewOutput {
    selectCustomUserAgentInput?: () => void;
}
export type View = (input: NetworkConfigViewInput, output: NetworkConfigViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NetworkConfigView extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    static instance(opts?: {
        forceNew: boolean | null;
    }): NetworkConfigView;
    performUpdate(): void;
    wasShown(): void;
}
interface UserAgentGroup {
    title: string;
    values: Array<{
        title: string;
        value: string;
        metadata: Protocol.Emulation.UserAgentMetadata | null;
    }>;
}
export declare const userAgentGroups: UserAgentGroup[];
export {};
