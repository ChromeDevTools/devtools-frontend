// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as InlineEditor from '../../../ui/legacy/components/inline_editor/inline_editor.js';

import * as ElementsComponents from './components.js';

function createAnchorFunctionLinkSwatch(
    props: Partial<ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatchData> = {}):
    ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatch {
  return new ElementsComponents.AnchorFunctionLinkSwatch.AnchorFunctionLinkSwatch({
    onLinkActivate: () => {},
    onMouseEnter: () => {},
    onMouseLeave: () => {},
    ...props,
  });
}

describeWithEnvironment('AnchorFunctionLinkSwatch', () => {
  describe('when identifier exists', () => {
    let linkSwatchDataStub: {
      set: sinon.SinonSpy,
    };

    beforeEach(() => {
      linkSwatchDataStub = sinon.spy(InlineEditor.LinkSwatch.LinkSwatch.prototype, 'data', ['set']);
    });

    afterEach(() => {
      linkSwatchDataStub.set.restore();
    });

    it('should render a defined link when `anchorNode` is resolved correctly', () => {
      const component = createAnchorFunctionLinkSwatch({
        identifier: '--identifier',
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
      });

      renderElementIntoDOM(component);

      assert.isTrue(linkSwatchDataStub.set.calledWith({
        text: '--identifier',
        isDefined: true,
        jslogContext: 'anchor-link',
        onLinkActivate: sinon.match.func,
      }));
    });

    it('should render an undefined link when `anchorNode` is not resolved correctly', () => {
      const component = createAnchorFunctionLinkSwatch({
        identifier: '--identifier',
        anchorNode: undefined,
      });

      renderElementIntoDOM(component);

      assert.isTrue(linkSwatchDataStub.set.calledWith({
        text: '--identifier',
        isDefined: false,
        jslogContext: 'anchor-link',
        onLinkActivate: sinon.match.func,
      }));
    });

    it('should call `onMouseEnter` when mouse enters linkSwatch', () => {
      const data = {
        identifier: '--identifier',
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        onMouseEnter: sinon.mock(),
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);
      const linkSwatch = component.shadowRoot!.querySelector('devtools-link-swatch')!;
      linkSwatch.dispatchEvent(new Event('mouseenter'));

      assert.isTrue(data.onMouseEnter.calledOnce);
    });

    it('should call `onMouseLeave` when mouse leaves linkSwatch', () => {
      const data = {
        identifier: '--identifier',
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        onMouseLeave: sinon.mock(),
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);
      const linkSwatch = component.shadowRoot!.querySelector('devtools-link-swatch')!;
      linkSwatch.dispatchEvent(new Event('mouseleave'));

      assert.isTrue(data.onMouseLeave.calledOnce);
    });
  });

  describe('when identifier does not exist', () => {
    it('should not render anything when `anchorNode` is not resolved correctly', () => {
      const data = {
        identifier: undefined,
        anchorNode: undefined,
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);

      assert.isEmpty(component.shadowRoot!.innerHTML);
    });

    it('should render icon link when `anchorNode` is resolved correctly', () => {
      const data = {
        identifier: undefined,
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);
      const icon = component.shadowRoot?.querySelector('devtools-icon');

      assert.exists(icon);
    });

    it('should call `onMouseEnter` when mouse enters the icon', () => {
      const data = {
        identifier: undefined,
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        onMouseEnter: sinon.mock(),
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);
      const icon = component.shadowRoot!.querySelector('devtools-icon')!;
      icon?.dispatchEvent(new Event('mouseenter'));

      assert.isTrue(data.onMouseEnter.calledOnce);
    });

    it('should call `onMouseLeave` when mouse leaves the icon', () => {
      const data = {
        identifier: undefined,
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        onMouseLeave: sinon.mock(),
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);
      const icon = component.shadowRoot!.querySelector('devtools-icon')!;
      icon?.dispatchEvent(new Event('mouseleave'));

      assert.isTrue(data.onMouseLeave.calledOnce);
    });

    it('should call `onLinkActivate` when clicking on the icon', () => {
      const data = {
        identifier: undefined,
        anchorNode: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        onLinkActivate: sinon.mock(),
      };
      const component = createAnchorFunctionLinkSwatch(data);

      renderElementIntoDOM(component);
      const icon = component.shadowRoot!.querySelector('devtools-icon')!;
      icon?.dispatchEvent(new Event('click'));

      assert.isTrue(data.onLinkActivate.calledOnce);
    });
  });
});
