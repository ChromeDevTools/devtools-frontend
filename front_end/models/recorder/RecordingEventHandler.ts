// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';

import type {Condition} from './Conditions.js';
import {WaitForNavigationCondition} from './Conditions.js';
import type {RecordingSession} from './RecordingSession.js';
import type {Step} from './Steps.js';
import {ChangeStep, ClickStep, CloseStep, StepFrameContext, SubmitStep} from './Steps.js';

interface Payload {
  type: string;
  selector: string;
  value: string;
}
export class RecordingEventHandler {
  private target: SDK.SDKModel.Target;
  private session: RecordingSession;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  private lastStep: Step|null;
  private lastStepTimeout: number|null;

  constructor(session: RecordingSession, target: SDK.SDKModel.Target) {
    this.target = target;
    this.session = session;
    this.lastStep = null;
    this.lastStepTimeout = null;

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('ResourceTreeModel instance is missing for the target: ' + target.id());
    }
    this.resourceTreeModel = resourceTreeModel;
  }

  getTarget(): string {
    return this.target.id() === 'main' ? 'main' : this.target.inspectedURL();
  }

  getContextForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): StepFrameContext {
    const path = [];
    let currentFrame: SDK.ResourceTreeModel.ResourceTreeFrame = frame;
    while (currentFrame) {
      const parentFrame = currentFrame.parentFrame();
      if (!parentFrame) {
        break;
      }

      const childFrames = parentFrame.childFrames;
      const index = childFrames.indexOf(currentFrame);
      path.unshift(index);
      currentFrame = parentFrame;
    }

    const target = this.getTarget();
    return new StepFrameContext(target, path);
  }

  bindingCalled(frameId: string, payload: Payload): void {
    const frame = this.resourceTreeModel.frameForId(frameId);
    if (!frame) {
      throw new Error('Could not find frame.');
    }

    const context = this.getContextForFrame(frame);

    switch (payload.type) {
      case 'click':
        this.appendStep(new ClickStep(context, payload.selector));
        break;
      case 'submit':
        this.appendStep(new SubmitStep(context, payload.selector));
        break;
      case 'change':
        this.appendStep(new ChangeStep(context, payload.selector, payload.value));
        break;
    }
  }

  async appendStep(step: Step): Promise<void> {
    await this.session.appendStep(step);
    this.lastStep = step;
    if (this.lastStepTimeout) {
      window.clearTimeout(this.lastStepTimeout);
    }
    this.lastStepTimeout = window.setTimeout(() => {
      this.lastStep = null;
      this.lastStepTimeout = null;
    }, 1000);
  }

  addConditionToLastStep(condition: Condition): void {
    if (!this.lastStep) {
      return;
    }

    this.lastStep.addCondition(condition);
  }

  targetDestroyed(): void {
    this.appendStep(new CloseStep(this.getTarget()));
  }

  targetInfoChanged(url: string): void {
    this.addConditionToLastStep(new WaitForNavigationCondition(url));
  }
}
