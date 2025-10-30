import type { ActionRegistry } from './ActionRegistry.js';
import { type Key, KeyboardShortcut, type Modifier } from './KeyboardShortcut.js';
export declare class ShortcutRegistry {
    private readonly actionRegistry;
    private readonly actionToShortcut;
    private readonly keyMap;
    private activePrefixKey;
    private activePrefixTimeout;
    private consumePrefix;
    private readonly devToolsDefaultShortcutActions;
    private readonly disabledDefaultShortcutsForAction;
    private readonly keybindSetSetting;
    private readonly userShortcutsSetting;
    constructor(actionRegistry: ActionRegistry);
    static instance(opts?: {
        forceNew: boolean | null;
        actionRegistry: ActionRegistry | null;
    }): ShortcutRegistry;
    static removeInstance(): void;
    private applicableActions;
    shortcutsForAction(action: string): KeyboardShortcut[];
    actionsForDescriptors(descriptors: Array<{
        key: number;
        name: string;
    }>): string[];
    globalShortcutKeys(): number[];
    keysForAction(actionId: string): number[];
    shortcutTitleForAction(actionId: string): string | undefined;
    keyAndModifiersForAction(actionId: string): {
        key: Key;
        modifier: Modifier;
    } | undefined;
    devToolsToChromeModifier(devToolsModifier: Modifier): number;
    handleShortcut(event: KeyboardEvent, handlers?: Record<string, () => Promise<boolean>>): void;
    actionHasDefaultShortcut(actionId: string): boolean;
    getShortcutListener(handlers: Record<string, () => Promise<boolean>>): (event: KeyboardEvent) => void;
    addShortcutListener(element: Element, handlers: Record<string, () => Promise<boolean>>): (arg0: Event) => void;
    handleKey(key: number, domKey: string, event?: KeyboardEvent, handlers?: Record<string, () => Promise<boolean>>): Promise<void>;
    registerUserShortcut(shortcut: KeyboardShortcut): void;
    removeShortcut(shortcut: KeyboardShortcut): void;
    disabledDefaultsForAction(actionId: string): Set<KeyboardShortcut>;
    private addShortcutToSetting;
    private removeShortcutFromSetting;
    private registerShortcut;
    private registerBindings;
    private isDisabledDefault;
}
export declare class ShortcutTreeNode {
    #private;
    private readonly depth;
    constructor(key: number, depth?: number);
    addAction(action: string): void;
    key(): number;
    chords(): Map<number, ShortcutTreeNode>;
    hasChords(): boolean;
    addKeyMapping(keys: number[], action: string): void;
    getNode(key: number): ShortcutTreeNode | null;
    actions(): string[];
    clear(): void;
}
export declare class ForwardedShortcut {
    static instance: ForwardedShortcut;
}
export declare const ForwardedActions: Set<string>;
export declare const KeyTimeout = 1000;
export declare const DefaultShortcutSetting = "devToolsDefault";
