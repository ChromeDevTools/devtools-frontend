import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import { Insets } from './DeviceModeModel.js';
export declare function computeRelativeImageURL(cssURLValue: string): string;
export declare class EmulatedDevice {
    #private;
    title: string;
    type: Type;
    order: number;
    vertical: Orientation;
    horizontal: Orientation;
    deviceScaleFactor: number;
    capabilities: string[];
    userAgent: string;
    userAgentMetadata: Protocol.Emulation.UserAgentMetadata | null;
    modes: Mode[];
    isDualScreen: boolean;
    isFoldableScreen: boolean;
    verticalSpanned: Orientation;
    horizontalSpanned: Orientation;
    constructor();
    static fromJSONV1(json: any): EmulatedDevice | null;
    static deviceComparator(device1: EmulatedDevice, device2: EmulatedDevice): number;
    modesForOrientation(orientation: string): Mode[];
    getSpanPartner(mode: Mode): Mode | undefined;
    getRotationPartner(mode: Mode): Mode | null;
    toJSON(): any;
    private orientationToJSON;
    modeImage(mode: Mode): string;
    outlineImage(mode: Mode): string;
    orientationByName(name: string): Orientation;
    show(): boolean;
    setShow(show: boolean): void;
    copyShowFrom(other: EmulatedDevice): void;
    touch(): boolean;
    mobile(): boolean;
}
export declare const Horizontal = "horizontal";
export declare const Vertical = "vertical";
export declare const HorizontalSpanned = "horizontal-spanned";
export declare const VerticalSpanned = "vertical-spanned";
declare enum Type {
    Phone = "phone",
    Tablet = "tablet",
    Notebook = "notebook",
    Desktop = "desktop",
    Unknown = "unknown"
}
export declare const enum Capability {
    TOUCH = "touch",
    MOBILE = "mobile"
}
export declare class EmulatedDevicesList extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    constructor();
    static instance(): EmulatedDevicesList;
    private updateStandardDevices;
    private listFromJSONV1;
    static rawEmulatedDevicesForTest(): typeof emulatedDevices;
    standard(): EmulatedDevice[];
    custom(): EmulatedDevice[];
    revealCustomSetting(): void;
    addCustomDevice(device: EmulatedDevice): void;
    removeCustomDevice(device: EmulatedDevice): void;
    saveCustomDevices(): void;
    saveStandardDevices(): void;
    private copyShowValues;
}
export declare const enum Events {
    CUSTOM_DEVICES_UPDATED = "CustomDevicesUpdated",
    STANDARD_DEVICES_UPDATED = "StandardDevicesUpdated"
}
export interface EventTypes {
    [Events.CUSTOM_DEVICES_UPDATED]: void;
    [Events.STANDARD_DEVICES_UPDATED]: void;
}
export interface Mode {
    title: string;
    orientation: string;
    insets: Insets;
    image: string | null;
}
export interface Orientation {
    width: number;
    height: number;
    outlineInsets: Insets | null;
    outlineImage: string | null;
    hinge: SDK.OverlayModel.Hinge | null;
}
export interface JSONMode {
    title: string;
    orientation: string;
    image?: string;
    insets: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
}
declare const emulatedDevices: ({
    order: number;
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    'dual-screen'?: undefined;
    modes?: undefined;
    'foldable-screen'?: undefined;
} | {
    order: number;
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    type: string;
    'user-agent-metadata'?: undefined;
    'dual-screen'?: undefined;
    modes?: undefined;
    'foldable-screen'?: undefined;
} | {
    order: number;
    'show-by-default': boolean;
    'dual-screen': boolean;
    title: string;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned': {
            width: number;
            height: number;
            hinge: {
                width: number;
                height: number;
                x: number;
                y: number;
                contentColor: {
                    r: number;
                    g: number;
                    b: number;
                    a: number;
                };
                outlineColor?: undefined;
            };
        };
        'horizontal-spanned': {
            width: number;
            height: number;
            hinge: {
                width: number;
                height: number;
                x: number;
                y: number;
                contentColor: {
                    r: number;
                    g: number;
                    b: number;
                    a: number;
                };
                outlineColor?: undefined;
            };
        };
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    modes: {
        title: string;
        orientation: string;
        insets: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        };
    }[];
    'foldable-screen'?: undefined;
} | {
    order: number;
    'show-by-default': boolean;
    'foldable-screen': boolean;
    title: string;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned': {
            width: number;
            height: number;
            hinge: {
                width: number;
                height: number;
                x: number;
                y: number;
                contentColor: {
                    r: number;
                    g: number;
                    b: number;
                    a: number;
                };
                outlineColor: {
                    r: number;
                    g: number;
                    b: number;
                    a: number;
                };
            };
        };
        'horizontal-spanned': {
            width: number;
            height: number;
            hinge: {
                width: number;
                height: number;
                x: number;
                y: number;
                contentColor: {
                    r: number;
                    g: number;
                    b: number;
                    a: number;
                };
                outlineColor: {
                    r: number;
                    g: number;
                    b: number;
                    a: number;
                };
            };
        };
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    modes: {
        title: string;
        orientation: string;
        insets: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        };
    }[];
    'dual-screen'?: undefined;
} | {
    order: number;
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    type: string;
    modes: {
        title: string;
        orientation: string;
    }[];
    'user-agent-metadata'?: undefined;
    'dual-screen'?: undefined;
    'foldable-screen'?: undefined;
} | {
    order: number;
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    modes: {
        title: string;
        orientation: string;
    }[];
    'dual-screen'?: undefined;
    'foldable-screen'?: undefined;
} | {
    order: number;
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'device-pixel-ratio': number;
        vertical: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    'dual-screen'?: undefined;
    modes?: undefined;
    'foldable-screen'?: undefined;
} | {
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    type: string;
    order?: undefined;
    'user-agent-metadata'?: undefined;
    'dual-screen'?: undefined;
    modes?: undefined;
    'foldable-screen'?: undefined;
} | {
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    order?: undefined;
    'dual-screen'?: undefined;
    modes?: undefined;
    'foldable-screen'?: undefined;
} | {
    title: string;
    type: string;
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    capabilities: string[];
    'show-by-default': boolean;
    screen: {
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    modes: {
        title: string;
        orientation: string;
        insets: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        };
        image: string;
    }[];
    order?: undefined;
    'dual-screen'?: undefined;
    'foldable-screen'?: undefined;
} | {
    title: string;
    type: string;
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    capabilities: string[];
    'show-by-default': boolean;
    screen: {
        'device-pixel-ratio': number;
        vertical: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        horizontal: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    modes: {
        title: string;
        orientation: string;
        insets: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        };
        image: string;
    }[];
    order?: undefined;
    'dual-screen'?: undefined;
    'foldable-screen'?: undefined;
} | {
    'show-by-default': boolean;
    title: string;
    screen: {
        horizontal: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'device-pixel-ratio': number;
        vertical: {
            outline: {
                image: string;
                insets: {
                    left: number;
                    top: number;
                    right: number;
                    bottom: number;
                };
            };
            width: number;
            height: number;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    'user-agent-metadata': {
        platform: string;
        platformVersion: string;
        architecture: string;
        model: string;
        mobile: boolean;
    };
    type: string;
    order?: undefined;
    'dual-screen'?: undefined;
    modes?: undefined;
    'foldable-screen'?: undefined;
} | {
    'show-by-default': boolean;
    title: () => Common.UIString.LocalizedString;
    screen: {
        horizontal: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'device-pixel-ratio': number;
        vertical: {
            width: number;
            height: number;
            outline?: undefined;
        };
        'vertical-spanned'?: undefined;
        'horizontal-spanned'?: undefined;
    };
    capabilities: string[];
    'user-agent': string;
    type: string;
    modes: {
        title: string;
        orientation: string;
    }[];
    order?: undefined;
    'user-agent-metadata'?: undefined;
    'dual-screen'?: undefined;
    'foldable-screen'?: undefined;
})[];
export {};
