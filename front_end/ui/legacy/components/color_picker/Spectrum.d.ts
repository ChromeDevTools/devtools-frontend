import '../../legacy.js';
import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';
import type { ContrastInfo } from './ContrastInfo.js';
export declare class Spectrum extends UI.Widget.VBox {
    #private;
    private gamut;
    private colorElement;
    private colorDragElement;
    private dragX;
    private dragY;
    private colorPickerButton;
    private readonly swatch;
    private hueElement;
    private hueSlider;
    private readonly alphaElement;
    private alphaElementBackground;
    private alphaSlider;
    private displayContainer;
    private textValues;
    private textLabels;
    private hexContainer;
    private hexValue;
    private readonly contrastInfo;
    private srgbOverlay;
    private contrastOverlay;
    private contrastDetails;
    private readonly contrastDetailsBackgroundColorPickerToggledBound;
    private readonly palettes;
    private readonly palettePanel;
    private palettePanelShowing;
    private readonly paletteSectionContainer;
    private paletteContainer;
    private shadesContainer;
    private readonly deleteIconToolbar;
    private readonly deleteButton;
    private readonly addColorToolbar;
    private readonly colorPickedBound;
    private hsv;
    private hueAlphaWidth;
    dragWidth: number;
    dragHeight: number;
    private colorDragElementHeight;
    slideHelperWidth: number;
    private numPaletteRowsShown;
    private selectedColorPalette;
    private customPaletteSetting;
    private colorOffset?;
    private closeButton?;
    private paletteContainerMutable?;
    private shadesCloseHandler?;
    private dragElement?;
    private dragHotSpotX?;
    private dragHotSpotY?;
    private colorFormat;
    private eyeDropperAbortController;
    private isFormatPickerShown;
    constructor(contrastInfoOrElement?: ContrastInfo | null | HTMLElement, element?: HTMLElement);
    private dragStart;
    private contrastDetailsBackgroundColorPickerToggled;
    private contrastPanelExpandedChanged;
    private updatePalettePanel;
    private togglePalettePanel;
    private onCloseBtnKeydown;
    private onSliderKeydown;
    private createPaletteColor;
    private showPalette;
    private showLightnessShades;
    private slotIndexForEvent;
    private isDraggingToBin;
    private paletteDragStart;
    private paletteDrag;
    private paletteDragEnd;
    private loadPalettes;
    addPalette(palette: Palette): void;
    private createPreviewPaletteElement;
    private paletteSelected;
    private resizeForSelectedPalette;
    private onPaletteColorKeydown;
    private onShadeColorKeydown;
    private onAddColorMousedown;
    private onAddColorKeydown;
    private addColorToCustomPalette;
    private showPaletteColorContextMenu;
    private deletePaletteColors;
    private colorSelected;
    get color(): Common.Color.Color;
    set color(color: Common.Color.Color);
    colorName(): string | undefined;
    private colorString;
    private updateHelperLocations;
    private updateInput;
    private hideSrgbOverlay;
    private showSrgbOverlay;
    private updateSrgbOverlay;
    private updateUI;
    private showFormatPicker;
    /**
     * If the pasted input is parsable as a color, applies it converting to the current user format
     */
    private pasted;
    private inputChanged;
    wasShown(): void;
    willHide(): void;
    toggleColorPicker(enabled?: boolean): Promise<void>;
    private colorPicked;
}
export declare const ChangeSource: {
    Input: string;
    Model: string;
    Other: string;
};
export declare class PaletteGenerator {
    private readonly callback;
    private readonly frequencyMap;
    constructor(callback: (arg0: Palette) => void);
    private frequencyComparator;
    private finish;
    private processStylesheet;
}
export declare const MaterialPalette: {
    title: string;
    mutable: boolean;
    matchUserFormat: boolean;
    colors: string[];
    colorNames: string[];
};
export declare class Swatch {
    private colorString;
    private swatchInnerElement;
    private swatchOverlayElement;
    private readonly swatchCopyIcon;
    constructor(parentElement: HTMLElement);
    setColor(color: Common.Color.Color, colorString?: string): void;
    private onCopyText;
    private onCopyIconMouseout;
}
export interface Palette {
    title: string;
    colors: string[];
    colorNames: string[];
    mutable: boolean;
    matchUserFormat?: boolean;
}
export declare class ColorChangedEvent extends Event {
    static readonly eventName = "spectrumcolorchanged";
    data: string;
    constructor(color: string);
}
export declare class SizeChangedEvent extends Event {
    static readonly eventName = "sizechanged";
    constructor();
}
declare global {
    interface HTMLElementEventMap {
        [ColorChangedEvent.eventName]: ColorChangedEvent;
        [SizeChangedEvent.eventName]: SizeChangedEvent;
    }
}
