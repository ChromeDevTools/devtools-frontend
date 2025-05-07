// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {
  setUpEnvironment,
} from '../../../testing/OverridesHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as NetworkComponents from './components.js';

const {urlString} = Platform.DevToolsPath;

function createNetworkRequest() {
  const networkRequest = SDK.NetworkRequest.NetworkRequest.createForSocket(
      'requestId' as Protocol.Network.RequestId, urlString`www.example.com/some/path:3000`);
  networkRequest.hasNetworkData = true;
  networkRequest.setRemoteAddress('www.example.com', 3000);
  networkRequest.protocol = 'tcp';

  networkRequest.statusText = 'Opening';
  networkRequest.directSocketInfo = {
    type: SDK.NetworkRequest.DirectSocketType.TCP,
    status: SDK.NetworkRequest.DirectSocketStatus.OPENING,
    createOptions: {
      remoteAddr: 'www.example.com/some/path',
      remotePort: 3000,
      noDelay: false,
      keepAliveDelay: 1001,
      sendBufferSize: 1002,
      receiveBufferSize: 1003,
      dnsQueryType: Protocol.Network.DirectSocketDnsQueryType.Ipv4,
    },
    openInfo: {remoteAddr: 'www.sample.com', remotePort: 3005, localAddr: '127.0.0.1', localPort: 9472}
  };
  networkRequest.setResourceType(Common.ResourceType.resourceTypes.DirectSocket);
  networkRequest.setIssueTime(Date.now(), Date.now());
  return networkRequest;
}
let view: ViewFunctionStub<typeof NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView>;
let socketConnectionView: NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView;

describeWithEnvironment('DirectSocketConnectionView', () => {
  beforeEach(() => {
    setUpEnvironment();

    view = createViewFunctionStub(NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView);
    socketConnectionView =
        new NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView(createNetworkRequest(), view);
    socketConnectionView.wasShown();
  });

  const categoryName = NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_GENERAL;

  describe('Category toggle', () => {
    it('opens', async () => {
      view.input.onToggleCategory({target: {open: true} as HTMLDetailsElement} as unknown as Event, categoryName);

      assert.isTrue((await view.nextInput).openCategories.includes(categoryName));
    });

    it('closes', async () => {
      view.input.onToggleCategory({target: {open: false} as HTMLDetailsElement} as unknown as Event, categoryName);

      assert.isFalse((await view.nextInput).openCategories.includes(categoryName));
    });
    it('opens after close', async () => {
      view.input.onToggleCategory({target: {open: true} as HTMLDetailsElement} as unknown as Event, categoryName);

      assert.isTrue((await view.nextInput).openCategories.includes(categoryName));
    });
  });

  describe('Handles arrow keys on category', () => {
    it('opens', async () => {
      // set initial state as closed
      view.input.onToggleCategory({target: {open: false} as HTMLDetailsElement} as unknown as Event, categoryName);
      assert.isFalse((await view.nextInput).openCategories.includes(categoryName));

      // make keyboard event to open
      view.input.onSummaryKeyDown(
          {
            target: {
              parentElement: {
                // current state
                open: false
              }
            },
            key: 'ArrowRight'
          } as unknown as KeyboardEvent,
          categoryName);

      assert.isTrue((await view.nextInput).openCategories.includes(categoryName));
    });

    it('closes', async () => {
      // set initial state as opened
      view.input.onToggleCategory({target: {open: true} as HTMLDetailsElement} as unknown as Event, categoryName);
      assert.isTrue((await view.nextInput).openCategories.includes(categoryName));

      // make keyboard event to close
      view.input.onSummaryKeyDown(
          {
            target: {
              parentElement: {
                // current state
                open: true
              }
            },
            key: 'ArrowLeft'
          } as unknown as KeyboardEvent,
          categoryName);

      assert.isFalse((await view.nextInput).openCategories.includes(categoryName));
    });

    it('does nothing if target is absent', async () => {
      // set initial state as opened
      view.input.onToggleCategory({target: {open: true} as HTMLDetailsElement} as unknown as Event, categoryName);
      // make keyboard event without target
      view.input.onSummaryKeyDown({key: 'ArrowLeft'} as unknown as KeyboardEvent, categoryName);

      assert.isTrue((await view.nextInput).openCategories.includes(categoryName));
    });

    it('ignores unknown keys', async () => {
      // set initial state as opened
      view.input.onToggleCategory({target: {open: true} as HTMLDetailsElement} as unknown as Event, categoryName);
      view.input.onSummaryKeyDown(
          {
            target: {
              parentElement: {
                // current state
                open: true
              }
            },
            // unknown key
            key: 'ArrowDown'
          } as unknown as KeyboardEvent,
          categoryName);

      assert.isTrue((await view.nextInput).openCategories.includes(categoryName));
    });
  });
});

describeWithEnvironment('view', () => {
  let target!: HTMLElement;
  const view = NetworkComponents.DirectSocketConnectionView.DEFAULT_VIEW;

  beforeEach(async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const widget = new UI.Widget.Widget();
    widget.markAsRoot();
    widget.show(container);
    target = widget.element;
    target.style.display = 'flex';
    target.style.flexDirection = 'column';
    target.style.width = '500px';
    target.style.height = '400px';
  });

  it('all categories are opened', async () => {
    const viewInput: NetworkComponents.DirectSocketConnectionView.ViewInput = {
      socketInfo: {
        type: SDK.NetworkRequest.DirectSocketType.TCP,
        status: SDK.NetworkRequest.DirectSocketStatus.OPENING,
        createOptions: {
          remoteAddr: 'www.example.com/some/path',
          remotePort: 3000,
          noDelay: false,
          keepAliveDelay: 1001,
          sendBufferSize: 1002,
          receiveBufferSize: 1003,
          dnsQueryType: Protocol.Network.DirectSocketDnsQueryType.Ipv4,
        },
        openInfo: {remoteAddr: 'www.sample.com', remotePort: 3005, localAddr: '127.0.0.1', localPort: 9472}
      },
      openCategories: [
        NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_GENERAL,
        NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_OPEN_INFO,
        NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_OPTIONS
      ],
      onSummaryKeyDown: () => {},
      onToggleCategory: () => {},
      onCopyRow: () => {}
    };

    view(viewInput, target);
    await assertScreenshot('direct_socket_connection_view/all_categories_open.png');
  });

  it('all categories are opened with some values absent', async () => {
    const viewInput: NetworkComponents.DirectSocketConnectionView.ViewInput = {
      socketInfo: {
        type: SDK.NetworkRequest.DirectSocketType.TCP,
        status: SDK.NetworkRequest.DirectSocketStatus.ABORTED,
        errorMessage: 'Cannot resolve hostname. And long error message goes next next next next',
        createOptions: {
          remoteAddr: 'www.example.com/some/path',
          remotePort: 3000,
        },
      },
      openCategories: [
        NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_GENERAL,
        NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_OPEN_INFO,
        NetworkComponents.DirectSocketConnectionView.CATEGORY_NAME_OPTIONS
      ],
      onSummaryKeyDown: () => {},
      onToggleCategory: () => {},
      onCopyRow: () => {}
    };

    view(viewInput, target);
    await assertScreenshot('direct_socket_connection_view/all_categories_open_values_absent.png');
  });

  it('all categories are closed', async () => {
    const viewInput: NetworkComponents.DirectSocketConnectionView.ViewInput = {
      socketInfo: {
        type: SDK.NetworkRequest.DirectSocketType.UDP_BOUND,
        status: SDK.NetworkRequest.DirectSocketStatus.CLOSED,
        createOptions: {
          remoteAddr: 'www.example.com/some/path',
          remotePort: 3000,
          noDelay: false,
          keepAliveDelay: 2001,
          sendBufferSize: 2002,
          receiveBufferSize: 2003,
          dnsQueryType: Protocol.Network.DirectSocketDnsQueryType.Ipv4,
        },
        openInfo: {remoteAddr: 'www.sample.com', remotePort: 3005, localAddr: '127.0.0.1', localPort: 9472}
      },
      openCategories: [],
      onSummaryKeyDown: () => {},
      onToggleCategory: () => {},
      onCopyRow: () => {}
    };

    view(viewInput, target);
    await assertScreenshot('direct_socket_connection_view/all_categories_closed.png');
  });
});
