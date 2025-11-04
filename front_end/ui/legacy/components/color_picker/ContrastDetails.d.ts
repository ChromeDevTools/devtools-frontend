import '../../legacy.js';
import * as Common from '../../../../core/common/common.js';
import { type ContrastInfo } from './ContrastInfo.js';
export declare class ContrastDetails extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private contrastInfo;
    private readonly toggleMainColorPicker;
    private readonly expandedChangedCallback;
    private readonly colorSelectedCallback;
    private passesAA;
    private contrastUnknown;
    private readonly noContrastInfoAvailable;
    private readonly contrastValueBubble;
    private contrastValue;
    private readonly contrastValueBubbleIcons;
    private readonly expandButton;
    private readonly expandedDetails;
    private readonly contrastThresholds;
    private readonly contrastAA;
    private contrastPassFailAA;
    private readonly contrastAAA;
    private contrastPassFailAAA;
    private readonly contrastAPCA;
    private contrastPassFailAPCA;
    private readonly chooseBgColor;
    private bgColorPickerButton;
    private readonly bgColorPickedBound;
    private readonly bgColorSwatch;
    constructor(contrastInfo: ContrastInfo, contentElement: Element, toggleMainColorPickerCallback: (arg0?: boolean | undefined, arg1?: Common.EventTarget.EventTargetEvent<unknown> | undefined) => void, expandedChangedCallback: () => void, colorSelectedCallback: (arg0: Common.Color.Legacy) => void);
    private showNoContrastInfoAvailableMessage;
    private hideNoContrastInfoAvailableMessage;
    private computeSuggestedColor;
    private onSuggestColor;
    private createFixColorButton;
    private update;
    private static showHelp;
    setVisible(visible: boolean): void;
    visible(): boolean;
    element(): HTMLElement;
    private expandButtonClicked;
    private topRowClicked;
    private toggleExpanded;
    collapse(): void;
    expanded(): boolean;
    backgroundColorPickerEnabled(): boolean;
    toggleBackgroundColorPicker(enabled: boolean): void;
    private bgColorPicked;
}
export declare const enum Events {
    BACKGROUND_COLOR_PICKER_WILL_BE_TOGGLED = "BackgroundColorPickerWillBeToggled"
}
export interface EventTypes {
    [Events.BACKGROUND_COLOR_PICKER_WILL_BE_TOGGLED]: boolean;
}
export declare class Swatch {
    private readonly swatchElement;
    private swatchInnerElement;
    private textPreview;
    constructor(parentElement: Element);
    setColors(fgColor: Common.Color.Legacy, bgColor: Common.Color.Legacy): void;
}
