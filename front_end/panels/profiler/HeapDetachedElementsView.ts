// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Elements from '../elements/elements.js';

import {
  type DataDisplayDelegate,
  ProfileEvents as ProfileTypeEvents,
  type ProfileHeader,
  ProfileType,
} from './ProfileHeader.js';
import {WritableProfileHeader} from './WritableProfileHeader.js';

const {html, render} = Lit;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Button text to get the detached elements retained by JavaScript.
   */
  startDetachedElements: 'Get detached elements',
  /**
   * @description The title for the collection of profiles that are gathered from various snapshots of the heap, using a sampling (e.g. every 1/100) technique.
   */
  detachedElementsTitle: 'Detached elements',
  /**
   * @description Description for the detached elements profiling option in the Memory panel.
   */
  detachedElementsDescription: 'Detached elements show objects retained by a JS reference',
  /**
   * @description Name of a profile.
   * @example {2} PH1
   */
  detachedElementProfile: 'Detached elements {PH1}',
  /**
   * @description Column header in detached elements table displaying detached DOM nodes.
   */
  detachedNodes: 'Detached nodes',
  /**
   * @description Column header in detached elements table displaying the number of detached DOM nodes.
   */
  nodeSize: 'Node count',
  /**
   * @description Label for the detached elements table.
   */
  detachedElementsList: 'Detached elements list',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapDetachedElementsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ParsedElement {
  elementInfo: Protocol.DOM.DetachedElementInfo;
  node: SDK.DOMModel.DOMNode;
  nodeCount: number;
}

export interface ViewInput {
  parsedElements: ParsedElement[];
}

export type ViewOutput = undefined;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <devtools-data-grid striped class="flex-auto" name=${i18nString(UIStrings.detachedElementsList)}>
      <table>
        <tr>
          <th id="detached-node">${i18nString(UIStrings.detachedNodes)}</th>
          <th id="detached-node-count">${i18nString(UIStrings.nodeSize)}</th>
        </tr>
        ${input.parsedElements.map(parsed => html`
          <tr jslog=${VisualLogging.tableRow('detached-element')}>
            <td>
              <devtools-widget
                ${widget(Elements.DOMTreeWidget.DOMTreeWidget, {
                  omitRootDOMNode: false,
                  selectEnabled: true,
                  hideGutter: true,
                  rootDOMNode: parsed.node,
                  showSelectionOnKeyboardFocus: true,
                  deindentSingleNode: true,
                })}
              ></devtools-widget>
            </td>
            <td>${parsed.nodeCount}</td>
          </tr>
        `)}
      </table>
    </devtools-data-grid>
  `, target, {container: {classes: ['detached-elements-view']}});
  // clang-format on
};

function calculateDetachedNodeCount(treeNode?: Protocol.DOM.Node): number {
  if (!treeNode) {
    return 0;
  }
  let count = 1;
  const queue: Protocol.DOM.Node[] = [];
  let node: Protocol.DOM.Node|undefined;
  queue.push(treeNode);
  while (queue.length > 0) {
    node = queue.shift();
    if (!node) {
      break;
    }
    if (node.childNodeCount) {
      count += node.childNodeCount;
    }
    if (node.children) {
      for (const child of node.children) {
        queue.push(child);
      }
    }
  }
  return count;
}

type View = typeof DEFAULT_VIEW;

export class DetachedElementsProfileView extends UI.View.SimpleView implements DataDisplayDelegate {
  readonly #view: View;
  #parsedElements: ParsedElement[] = [];
  profile: DetachedElementsProfileHeader;
  readonly parentDataDisplayDelegate: DataDisplayDelegate;

  constructor(dataDisplayDelegate: DataDisplayDelegate, profile: DetachedElementsProfileHeader,
              view: View = DEFAULT_VIEW) {
    super({
      title: i18nString(UIStrings.detachedElementsTitle),
      viewId: 'detached-elements',
    });
    this.#view = view;
    this.profile = profile;
    this.parentDataDisplayDelegate = dataDisplayDelegate;
    this.populateElementsGrid(profile.detachedElements);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({parsedElements: this.#parsedElements}, undefined, this.contentElement);
  }

  showProfile(profile: ProfileHeader|null): UI.Widget.Widget|null {
    return this.parentDataDisplayDelegate.showProfile(profile);
  }

  showObject(objectId: string, perspectiveName: string): void {
    this.parentDataDisplayDelegate.showObject(objectId, perspectiveName);
  }

  async linkifyObject(): Promise<Element|null> {
    return null;
  }

  populateElementsGrid(detachedElements: Protocol.DOM.DetachedElementInfo[]|null): void {
    const domModel = this.profile.heapProfilerModel()?.target().model(SDK.DOMModel.DOMModel);
    if (!detachedElements || !domModel) {
      return;
    }

    this.#parsedElements = detachedElements.map(elementInfo => {
      const retainedNodeIds = new Set((elementInfo.retainedNodeIds ?? []) as unknown as Protocol.DOM.BackendNodeId[]);
      const node = SDK.DOMModel.DOMNode.create(domModel, null, false, elementInfo.treeNode, retainedNodeIds);
      node.detached = true;
      return {elementInfo, node, nodeCount: calculateDetachedNodeCount(elementInfo.treeNode)};
    });
    this.requestUpdate();
  }
}

const DetachedElementsProfileTypeBase:
    Common.ObjectWrapper.EventMixin<DetachedElementsProfileType.EventTypes, typeof ProfileType> =
    Common.ObjectWrapper.eventMixin(
        ProfileType,
    );

export class DetachedElementsProfileType extends DetachedElementsProfileTypeBase {
  constructor(typeId?: string, description?: string) {
    super(
        typeId || i18nString(UIStrings.detachedElementsTitle),
        description || i18nString(UIStrings.detachedElementsTitle));
  }

  override profileBeingRecorded(): DetachedElementsProfileHeader|null {
    return super.profileBeingRecorded() as DetachedElementsProfileHeader | null;
  }

  override get buttonTooltip(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.startDetachedElements);
  }

  override buttonClicked(): boolean {
    void this.getDetachedElements();
    return false;
  }

  async getDetachedElements(): Promise<void> {
    if (this.profileBeingRecorded()) {
      return;
    }
    const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
    const target = heapProfilerModel?.target();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (!heapProfilerModel || !target || !domModel) {
      return;
    }

    const data = await domModel.getDetachedDOMNodes();

    const profile: DetachedElementsProfileHeader = new DetachedElementsProfileHeader(heapProfilerModel, this, data);
    this.addProfile(profile);

    this.dispatchEventToListeners(ProfileTypeEvents.PROFILE_COMPLETE, profile);
  }

  override get treeItemTitle(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.detachedElementsTitle);
  }

  override get description(): string {
    return i18nString(UIStrings.detachedElementsDescription);
  }

  override isInstantProfile(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly TypeId = 'DetachedElements';
}

export namespace DetachedElementsProfileType {
  export const enum Events {
    RECORDING_STOPPED = 'RecordingStopped',
    STATS_UPDATE = 'StatsUpdate',
    DETACHED_ELEMENTS_OBTAINED = 'DetachedElementsObtained',
  }

  export interface EventTypes {
    [Events.RECORDING_STOPPED]: void;
    [Events.STATS_UPDATE]: Protocol.HeapProfiler.SamplingHeapProfile|null;
    [Events.DETACHED_ELEMENTS_OBTAINED]: Protocol.DOM.DetachedElementInfo[]|null;
  }
}

export class DetachedElementsProfileHeader extends WritableProfileHeader {
  readonly #heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null;
  readonly detachedElements: Protocol.DOM.DetachedElementInfo[]|null;
  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null,
      type: DetachedElementsProfileType,
      detachedElements: Protocol.DOM.DetachedElementInfo[]|null,
      title?: string,
  ) {
    super(
        heapProfilerModel?.debuggerModel() ?? null,
        type,
        title || i18nString(UIStrings.detachedElementProfile, {PH1: type.nextProfileUid()}),
    );
    this.detachedElements = detachedElements;
    this.#heapProfilerModel = heapProfilerModel;
  }

  heapProfilerModel(): SDK.HeapProfilerModel.HeapProfilerModel|null {
    return this.#heapProfilerModel;
  }

  override profileType(): DetachedElementsProfileType {
    return super.profileType() as DetachedElementsProfileType;
  }
}
