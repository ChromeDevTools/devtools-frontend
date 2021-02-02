// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';
import {IssueView} from './IssuesPane.js';

export class AffectedElementsView extends AffectedResourcesView {
  private issue: SDK.Issue.Issue;

  constructor(parent: IssueView, issue: SDK.Issue.Issue) {
    super(parent, {singular: ls`element`, plural: ls`elements`});
    this.issue = issue;
  }

  private sendTelemetry(): void {
    Host.userMetrics.issuesPanelResourceOpened(this.issue.getCategory(), AffectedItem.Element);
  }

  private async appendAffectedElements(affectedElements: Iterable<SDK.Issue.AffectedElement>): Promise<void> {
    let count = 0;
    for (const element of affectedElements) {
      await this.appendAffectedElement(element);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  private async appendAffectedElement(element: SDK.Issue.AffectedElement): Promise<void> {
    const cellElement = await this.renderElementCell(element);
    const rowElement = document.createElement('tr');
    rowElement.appendChild(cellElement);
    this.affectedResources.appendChild(rowElement);
  }

  protected async renderElementCell({backendNodeId, nodeName}: SDK.Issue.AffectedElement): Promise<Element> {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget() as SDK.SDKModel.Target;
    const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(mainTarget, backendNodeId);
    const anchorElement = (await Common.Linkifier.Linkifier.linkify(deferredDOMNode)) as HTMLElement;
    anchorElement.textContent = nodeName;
    anchorElement.addEventListener('click', () => this.sendTelemetry());
    anchorElement.addEventListener('keydown', (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        this.sendTelemetry();
      }
    });
    const cellElement = document.createElement('td');
    cellElement.classList.add('affected-resource-element', 'devtools-link');
    cellElement.appendChild(anchorElement);
    return cellElement;
  }

  update(): void {
    this.clear();
    this.appendAffectedElements(this.issue.elements());
  }
}
