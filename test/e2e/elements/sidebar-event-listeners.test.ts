// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {CONSOLE_ALL_MESSAGES_SELECTOR, navigateToConsoleTab} from '../helpers/console-helpers.js';
import {
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
  waitForPartialContentOfSelectedElementsNode,
  waitForSelectedNodeToBeExpanded,
} from '../helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

describe('Event listeners in the elements sidebar', () => {
  const loadEventListenersAndSelectButtonNode = async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage) => {
    await inspectedPage.goToResource('elements/sidebar-event-listeners.html');
    await waitForElementsStyleSection(devToolsPage, undefined);

    // Wait for element to be expanded
    await waitForSelectedNodeToBeExpanded(devToolsPage);

    // Select the button that has the events and make sure it's selected
    await devToolsPage.page.keyboard.press('ArrowRight');
    await waitForContentOfSelectedElementsNode(devToolsPage,
                                               '<button id=\u200B"test-button">\u200Bhello world\u200B</button>\u200B');
  };

  const EVENT_LISTENERS_PANEL_LINK = '[aria-label="Event Listeners"]';
  /* We add :not(.hidden) here because EventListenersView keeps event types whose listeners are all
   * filtered out (e.g. by the framework or passive/blocking filters) in the tree. The `hidden` attribute of
   * the template is reflected as the `.hidden` class on the rendered tree element.
   */
  const EVENT_LISTENERS_SELECTOR = 'li[aria-label$="event listener"]:not(.hidden)';
  const RESOLVE_FRAMEWORK_LISTENERS_SELECTOR = '[title="Resolve event listeners bound with framework"]';
  const SHOW_ANCESTORS_SELECTOR = '[title="Show listeners on the ancestors"]';

  const getDisplayedEventListenerNames = async (devToolsPage: DevToolsPage) => {
    const eventListeners = await devToolsPage.$$(EVENT_LISTENERS_SELECTOR);
    const eventListenerNames = await Promise.all(eventListeners.map(listener => listener.evaluate(l => l.textContent)));
    return eventListenerNames;
  };

  interface ListenerRow {
    origin: string|null;
    hidden: boolean;
    details: string;
    hasTogglePassiveButton: boolean;
    properties: Record<string, string>;
  }

  const listenerTypeSelector = (type: string) => `[aria-label="${type}, event listener"]`;

  /**
   * Returns the listener rows (one per registered listener) of the given event type group in
   * display order, together with their (already expanded) properties.
   */
  const getListenerRows = async(devToolsPage: DevToolsPage, type: string): Promise<ListenerRow[]> => {
    const rows = await devToolsPage.$$(`${listenerTypeSelector(type)} + ol > li`);
    return await Promise.all(rows.map(row => row.evaluate((row: Element): ListenerRow => {
      const properties: Record<string, string> = {};
      const children = row.nextElementSibling;
      if (children?.tagName === 'OL') {
        for (const child of children.querySelectorAll(':scope > li')) {
          const name = child.querySelector('.name')?.textContent;
          const value = child.querySelector('.value')?.textContent;
          if (name && typeof value === 'string') {
            properties[name] = value;
          }
        }
      }
      return {
        origin: row.getAttribute('data-origin'),
        hidden: row.classList.contains('hidden'),
        details: row.querySelector('.event-listener-details')?.textContent ?? '',
        hasTogglePassiveButton: Boolean(row.querySelector('button.event-listener-button')),
        properties,
      };
    })));
  };

  /**
   * Alt+click on an event type group expands it recursively, i.e. also expands every listener row so that
   * their `handler`, `once`, `passive` and `useCapture` properties are rendered.
   */
  const expandListenerGroup = async (devToolsPage: DevToolsPage, type: string, expectedRowCount: number) => {
    const group = await devToolsPage.waitFor(listenerTypeSelector(type));
    if (await group.evaluate(e => e.getAttribute('aria-expanded') === 'true')) {
      // Listener rows are re-created when the listeners are reloaded, so collapse and re-expand the whole group.
      await devToolsPage.click(listenerTypeSelector(type), {modifiers: {alt: true}});
      await devToolsPage.waitFor(`${listenerTypeSelector(type)}[aria-expanded="false"]`);
    }
    await devToolsPage.click(listenerTypeSelector(type), {modifiers: {alt: true}});
    return await devToolsPage.waitForFunction(async () => {
      const rows = await getListenerRows(devToolsPage, type);
      if (rows.length !== expectedRowCount || rows.some(row => !row.hidden && !('handler' in row.properties))) {
        return undefined;
      }
      return rows;
    });
  };

  const getEventListenerProperties =
      async(devToolsPage: DevToolsPage, selector: string): Promise<Array<[string, string]>> => {
    const clickEventProperties = await devToolsPage.$$(selector);

    const propertiesOutput =
        await Promise.all(clickEventProperties.map(n => n.evaluate((node: Element): [string, string] => {
          const nameNode = node.querySelector('.name');
          const valueNode = node.querySelector('.value');

          if (!nameNode || !valueNode) {
            throw new Error('Could not find a name and value node for event listener properties.');
          }

          const key = nameNode.textContent;
          const value = valueNode.textContent;
          return [key, value];
        })));

    return propertiesOutput;
  };

  const getFirstNodeForEventListener = async (devToolsPage: DevToolsPage, listenerTypeSelector: string) => {
    await devToolsPage.click(listenerTypeSelector);

    const listenerNodesSelector = `${listenerTypeSelector} + ol>li`;
    const firstListenerNode = await devToolsPage.waitFor(listenerNodesSelector);
    if (!firstListenerNode) {
      throw new Error(`Could not find listener node for selector ${listenerNodesSelector}`);
    }
    const firstListenerText = await firstListenerNode.evaluate((node: Element) => {
      return node.textContent || '';
    });

    return {
      firstListenerText,
      listenerSelector: listenerNodesSelector,
    };
  };

  const openEventListenersPaneAndWaitForListeners = async (devToolsPage: DevToolsPage) => {
    let eventListenersPanel = await devToolsPage.$('Event Listeners', undefined, 'aria');
    if (!eventListenersPanel) {
      await devToolsPage.clickMoreTabsButton();
      eventListenersPanel = await devToolsPage.waitFor(EVENT_LISTENERS_PANEL_LINK);
    }
    await devToolsPage.clickElement(eventListenersPanel);
    await devToolsPage.waitFor(EVENT_LISTENERS_SELECTOR);
  };

  const selectNodeWithPartialText = async (devToolsPage: DevToolsPage, partialText: string) => {
    const node = await waitForElementWithPartialText(devToolsPage, partialText);
    await node.click();
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, partialText);
  };

  const waitForDisplayedEventListenerNames = async (devToolsPage: DevToolsPage, expected: string[]) => {
    await devToolsPage.waitForFunction(async () => {
      const names = await getDisplayedEventListenerNames(devToolsPage);
      return names.length === expected.length && names.every((name, index) => name === expected[index]);
    });
  };

  /** Extracts the function name from the handler preview, e.g. `ƒ clickHandler(event)`. */
  const handlerName = (row: ListenerRow) => /(\w+)\s*\(/.exec(row.properties['handler'] ?? '')?.[1];
  const targetOf = (row: ListenerRow) => /^(button#node|document|body)/.exec(row.details)?.[1];

  it('lists the active event listeners on the page', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);

    const eventListenerNames = await getDisplayedEventListenerNames(devToolsPage);
    assert.deepEqual(eventListenerNames, ['click', 'custom event', 'hover']);
  });

  it('shows the event listener properties when expanding it', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener(devToolsPage, '[aria-label="click, event listener"]');

    // check that we have the right event for the right element
    // we can't use assert.strictEqual() as the text also includes the "Remove" button
    assert.include(firstListenerText, 'button#test-button');

    // we have to use keyboard navigation here to expand
    // the event, as single click reveals it in the elements
    // tree and double click triggers the "Remove" button on
    // some platforms.
    await devToolsPage.page.keyboard.press('ArrowRight');  // select
    await devToolsPage.page.keyboard.press('ArrowRight');  // expand
    await devToolsPage.waitFor(`${listenerSelector}[aria-expanded="true"]`);

    const clickEventPropertiesSelector = `${listenerSelector} + ol .name-and-value`;

    await devToolsPage.waitForFunction(async () => {
      const propertiesOutput = await getEventListenerProperties(devToolsPage, clickEventPropertiesSelector);
      const flatProperties = propertiesOutput.flat();
      const expected = [
        ['handler', '() => {}'],
        ['once', 'false'],
        ['passive', 'false'],
        ['useCapture', 'false'],
      ].flat();

      return flatProperties.length === expected.length && !flatProperties.some((v, index) => v !== expected[index]);
    });
  });

  it('shows custom event listeners and their properties correctly', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener(devToolsPage, '[aria-label="custom event, event listener"]');

    // check that we have the right event for the right element
    // we can't use assert.strictEqual() as the text also includes the "Remove" button
    assert.include(firstListenerText, 'body');

    // we have to use keyboard navigation here to expand
    // the event, as single click reveals it in the elements
    // tree and double click triggers the "Remove" button on
    // some platforms.
    await devToolsPage.page.keyboard.press('ArrowRight');  // select
    await devToolsPage.page.keyboard.press('ArrowRight');  // expand
    await devToolsPage.waitFor(`${listenerSelector}[aria-expanded="true"]`);

    const customEventProperties = `${listenerSelector} + ol .name-and-value`;
    await devToolsPage.waitForFunction(async () => {
      const propertiesOutput = await getEventListenerProperties(devToolsPage, customEventProperties);
      const flatProperties = propertiesOutput.flat();
      const expected = [
        ['handler', '() => console.log(\'test\')'],
        ['once', 'true'],
        ['passive', 'false'],
        ['useCapture', 'true'],
      ].flat();

      return flatProperties.length === expected.length && !flatProperties.some((v, index) => v !== expected[index]);
    });
  });

  it('shows delete button by each node for a given event', async ({devToolsPage, inspectedPage}) => {
    await loadEventListenersAndSelectButtonNode(devToolsPage, inspectedPage);
    await openEventListenersPaneAndWaitForListeners(devToolsPage);
    const {
      firstListenerText,
      listenerSelector,
    } = await getFirstNodeForEventListener(devToolsPage, '[aria-label="click, event listener"]');

    // Check that we have the right event for the right element
    // and that it has the delete button within it.
    assert.include(firstListenerText, 'button#test-button');
    const removeButtonSelector = `${listenerSelector} devtools-button`;
    const removeButton = await devToolsPage.waitFor(removeButtonSelector);
    const buttonTitle = await removeButton.evaluate(n => {
      const button = n.shadowRoot?.querySelector('button');
      return button?.title;
    });
    assert.strictEqual(buttonTitle, 'Delete event listener');

    await devToolsPage.click(removeButtonSelector);

    // Removing a listener is asynchronous, so wait for the 'click' event to disappear.
    await devToolsPage.waitForFunction(async () => {
      const eventListenerNames = await getDisplayedEventListenerNames(devToolsPage);
      return !eventListenerNames.includes('click');
    });
    const eventListenerNames = await getDisplayedEventListenerNames(devToolsPage);
    assert.deepEqual(eventListenerNames, ['custom event', 'hover']);
  });

  it('displays custom framework event listeners defined via devtoolsFrameworkEventListeners',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
        <button id="framework-btn">Framework Button</button>
        <script>
          const btn = document.getElementById('framework-btn');
          function internalHandler() {}
          function customFrameworkHandler() {}
          btn.addEventListener('click', internalHandler);
          window.devtoolsFrameworkEventListeners = [
            node => {
              if (node === btn) {
                return {
                  eventListeners: [{
                    type: 'framework-click',
                    useCapture: false,
                    passive: false,
                    once: false,
                    handler: customFrameworkHandler,
                  }],
                  internalHandlers: [internalHandler],
                };
              }
              return {eventListeners: []};
            },
          ];
        </script>
      `);
       await waitForElementsStyleSection(devToolsPage, undefined);
       const buttonNode = await waitForElementWithPartialText(devToolsPage, 'framework-btn');
       await buttonNode.click();
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'framework-btn');
       await openEventListenersPaneAndWaitForListeners(devToolsPage);
       const names = await getDisplayedEventListenerNames(devToolsPage);
       assert.include(names, 'framework-click');
     });

  it('orders listeners within a type group and shows attribute, handleEvent and passive listeners',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
        <button id="node">Inspect Me</button>
        <div id="node-without-listeners"></div>
        <script>
          // Handlers are named so they can be told apart in the sidebar, which previews them as 'ƒ name(event)'.
          function documentClickHandler(event) {}
          function f() {}
          const button = document.getElementById('node');
          button.addEventListener('click', function bubblingBeforeAttribute(event) {}, false);
          button.addEventListener('hover', function hoverHandler(event) {}, false);
          button.addEventListener('click', function buttonCapturing(event) {}, true);
          button.onclick = function buttonAttribute(event) {};
          button.addEventListener('click', function bubblingAfterAttribute(event) {}, false);
          document.onclick = documentClickHandler;
          document.addEventListener('click', function documentCapturing(event) {}, true);
          document.addEventListener('mousedown', f, false);
          document.removeEventListener('mousedown', f, false);
          document.body.addEventListener('custom event', f, {capture: true, once: true});
          function ObjectHandler() { document.addEventListener('click', this, true); }
          new ObjectHandler();
          function EventListenerImpl() { document.addEventListener('click', this, true); }
          EventListenerImpl.prototype.handleEvent = function documentHandleEvent() {};
          new EventListenerImpl();
          document.body.addEventListener('wheel', f, {passive: true});
          document.body.addEventListener('wheel', f, {passive: true, capture: true});
          document.body.removeEventListener('wheel', f, {passive: true, capture: true});
        </script>
      `);
       await selectNodeWithPartialText(devToolsPage, '"node">');
       await openEventListenersPaneAndWaitForListeners(devToolsPage);

       // The removed `mousedown` listener is not shown.
       await waitForDisplayedEventListenerNames(devToolsPage, ['click', 'custom event', 'hover', 'wheel']);

       // Listeners on the target come before listeners on its ancestors; on each object capturing listeners come
       // first, followed by the bubbling ones in registration order (including the `on*` attribute handler). The
       // object without `handleEvent` is not listed, the `handleEvent` of the other one is used as handler.
       const clickRows = await expandListenerGroup(devToolsPage, 'click', 7);
       assert.deepEqual(clickRows.map(row => [targetOf(row), handlerName(row), row.properties['useCapture']]), [
         ['button#node', 'buttonCapturing', 'true'],
         ['button#node', 'bubblingBeforeAttribute', 'false'],
         ['button#node', 'buttonAttribute', 'false'],
         ['button#node', 'bubblingAfterAttribute', 'false'],
         ['document', 'documentCapturing', 'true'],
         ['document', 'documentHandleEvent', 'true'],
         ['document', 'documentClickHandler', 'false'],
       ]);
       assert.isTrue(clickRows.every(row => row.origin === 'Raw' && !row.hidden && !row.hasTogglePassiveButton));

       // Only the non-removed passive `wheel` listener is shown and it can be toggled to blocking.
       let [wheelRow] = await expandListenerGroup(devToolsPage, 'wheel', 1);
       assert.strictEqual(targetOf(wheelRow), 'body');
       assert.strictEqual(wheelRow.properties['passive'], 'true');
       assert.strictEqual(wheelRow.properties['useCapture'], 'false');
       assert.isTrue(wheelRow.hasTogglePassiveButton);
       // Toggling reloads the listeners, which replaces the listener rows. Wait for the old row to be detached
       // before expanding the group again, so that the group isn't toggled while the reload is in flight.
       const oldWheelRow = await devToolsPage.waitFor(`${listenerTypeSelector('wheel')} + ol > li`);
       await devToolsPage.click(`${listenerTypeSelector('wheel')} + ol > li button.event-listener-button`);
       await devToolsPage.waitForFunction(async () => await oldWheelRow.evaluate(e => !e.isConnected));
       [wheelRow] = await expandListenerGroup(devToolsPage, 'wheel', 1);
       assert.strictEqual(wheelRow.properties['passive'], 'false');
       assert.strictEqual(wheelRow.properties['useCapture'], 'false');

       // A node without own listeners only shows the listeners of its ancestors, and none once ancestors are
       // excluded.
       await selectNodeWithPartialText(devToolsPage, 'node-without-listeners');
       await waitForDisplayedEventListenerNames(devToolsPage, ['click', 'custom event', 'wheel']);
       await devToolsPage.click(SHOW_ANCESTORS_SELECTOR);
       await devToolsPage.waitForNone(EVENT_LISTENERS_SELECTOR);
     });

  it('resolves custom framework listeners, hides internal handlers and reports API errors',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
        <button id="inspectedNode">Inspect Me</button>
        <script>
          function setupNormalPath() {
            const inspectedNode = document.getElementById('inspectedNode');
            inspectedNode.addEventListener('click', internalHandler);
            function customFirstEventListener(e) { console.log("I'm first custom event listener"); }
            function customSecondEventListener(e) { console.log("I'm second custom event listener"); }
            function internalHandler(e) {
              if (e.type === 'customFirst') customFirstEventListener(e);
              if (e.type === 'customSecond') customSecondEventListener(e);
            }
            window.devtoolsFrameworkEventListeners = window.devtoolsFrameworkEventListeners || [];
            window.devtoolsFrameworkEventListeners.push(function frameworkEventListeners(node) {
              if (node === inspectedNode) {
                return {
                  eventListeners: [
                    {type: 'customFirst', useCapture: true, passive: false, once: false, handler: customFirstEventListener},
                    {type: 'customSecond', useCapture: false, passive: false, once: false, handler: customSecondEventListener},
                  ],
                  internalHandlers: [internalHandler],
                };
              }
              return {eventListeners: []};
            });
          }

          function setupReturnIncorrectResult() {
            const fetchers = window.devtoolsFrameworkEventListeners = window.devtoolsFrameworkEventListeners || [];
            fetchers.push(function() { throw 'Error in fetcher'; });
            fetchers.push(function() { return null; });
            fetchers.push(function() { return {eventListeners: [], internalHandlers: [undefined, null]}; });
            fetchers.push(function() {
              const obj = {};
              Object.defineProperty(obj, 'eventListeners', {get: function() { throw 'Error in getter'; }});
              return obj;
            });
            fetchers.push(function() { return {eventListeners: [{}]}; });
          }

          window.setupExceptionInGetter = function() {
            Object.defineProperty(window, 'devtoolsFrameworkEventListeners', {get: function() { throw 'Error in getter'; }});
          };

          setupReturnIncorrectResult();
          setupNormalPath();
        </script>
      `);
       await selectNodeWithPartialText(devToolsPage, 'inspectedNode');
       await openEventListenersPaneAndWaitForListeners(devToolsPage);

       // The internal handler is marked as a framework listener and hidden, only the resolved listeners are shown.
       await waitForDisplayedEventListenerNames(devToolsPage, ['customFirst', 'customSecond']);
       const [customFirst] = await expandListenerGroup(devToolsPage, 'customFirst', 1);
       assert.strictEqual(customFirst.origin, 'FrameworkUser');
       assert.include(customFirst.properties['handler'], 'customFirstEventListener');
       assert.strictEqual(customFirst.properties['useCapture'], 'true');
       const [customSecond] = await expandListenerGroup(devToolsPage, 'customSecond', 1);
       assert.strictEqual(customSecond.origin, 'FrameworkUser');
       assert.include(customSecond.properties['handler'], 'customSecondEventListener');
       assert.strictEqual(customSecond.properties['useCapture'], 'false');

       // Without resolving framework listeners the internal handler is shown instead.
       await devToolsPage.click(RESOLVE_FRAMEWORK_LISTENERS_SELECTOR);
       await waitForDisplayedEventListenerNames(devToolsPage, ['click']);
       const [internal] = await expandListenerGroup(devToolsPage, 'click', 1);
       assert.strictEqual(internal.origin, 'Framework');
       assert.include(internal.properties['handler'], 'internalHandler');
       await devToolsPage.click(RESOLVE_FRAMEWORK_LISTENERS_SELECTOR);
       await waitForDisplayedEventListenerNames(devToolsPage, ['customFirst', 'customSecond']);

       // When accessing the fetchers throws, the listeners fall back to raw listeners.
       await inspectedPage.evaluate(
           () => (window as unknown as {setupExceptionInGetter: () => void}).setupExceptionInGetter());
       await devToolsPage.click('[aria-label="Refresh event listeners"]');
       await waitForDisplayedEventListenerNames(devToolsPage, ['click']);
       const [raw] = await expandListenerGroup(devToolsPage, 'click', 1);
       assert.strictEqual(raw.origin, 'Raw');
       assert.include(raw.properties['handler'], 'internalHandler');

       // Errors produced by the fetchers are reported in the console.
       await navigateToConsoleTab(devToolsPage);
       const expectedErrors = [
         'Framework Event Listeners API Errors:',
         'fetcher call produced error: Error in fetcher',
         'fetcher call produced error: TypeError: Cannot read properties of null (reading \'eventListeners\')',
         'internal handler isn\'t a function or empty',
         'fetcher call produced error: Error in getter',
         'event listener\'s type isn\'t string or empty, event listener\'s useCapture isn\'t boolean or undefined',
         // The last character is intentionally truncated due to `errorString.substr(0, errorString.length - 1)`
         // in `EventListenersUtils.ts`.
         'devtoolsFrameworkEventListeners call produced error: Error in gett',
       ];
       await devToolsPage.waitForFunction(async () => {
         const messages = await devToolsPage.$$(CONSOLE_ALL_MESSAGES_SELECTOR);
         const text = (await Promise.all(messages.map(m => m.evaluate(e => e.textContent ?? '')))).join('\n');
         return expectedErrors.every(error => text.includes(error));
       });
     });

  interface JQueryLikeData {
    handle?: unknown;
  }

  interface JQueryLike {
    data(elem: Element): JQueryLikeData;
  }

  interface JQueryLikeWindow {
    calls: string[];
    jQuery: JQueryLike;
  }

  const jQueryLikeFramework = (dataApi: '_data'|'data') => `
    (function() {
      // Mimics how jQuery stores event handlers: a single dispatcher per element is registered via
      // addEventListener and the user handlers are kept in the element's data store.
      const store = new WeakMap();
      function dataFor(elem) {
        if (!store.has(elem)) {
          store.set(elem, {});
        }
        return store.get(elem);
      }
      function Wrapper(elems) {
        elems.forEach((elem, i) => { this[i] = elem; });
        this.length = elems.length;
      }
      function jQuery(selector) {
        return new Wrapper(typeof selector === 'string' ? Array.from(document.querySelectorAll(selector)) : [selector]);
      }
      jQuery.fn = Wrapper.prototype;
      jQuery.event = {
        dispatch(event) {
          for (const handleObj of ((dataFor(this).events || {})[event.type] || []).slice()) {
            handleObj.handler.call(this, event);
          }
        },
      };
      jQuery.fn.each = function(callback) {
        for (let i = 0; i < this.length; ++i) {
          callback(this[i]);
        }
        return this;
      };
      jQuery.fn.on = function(type, handler) {
        return this.each(elem => {
          const data = dataFor(elem);
          if (!data.events) {
            data.events = {};
            data.handle = function dispatcher() { return jQuery.event.dispatch.apply(elem, arguments); };
          }
          if (!data.events[type]) {
            data.events[type] = [];
            elem.addEventListener(type, data.handle, false);
          }
          data.events[type].push({type, handler, selector: undefined});
        });
      };
      jQuery.fn.click = function(handler) {
        return this.on('click', handler);
      };
      jQuery.fn.off = function(type, selector, handler) {
        return this.each(elem => {
          const data = dataFor(elem);
          if (!data.events || !data.events[type]) {
            return;
          }
          data.events[type] = data.events[type].filter(h => h.handler !== handler || (selector && h.selector !== selector));
          if (!data.events[type].length) {
            elem.removeEventListener(type, data.handle, false);
            delete data.events[type];
          }
          if (!Object.keys(data.events).length) {
            delete data.events;
            delete data.handle;
          }
        });
      };
      jQuery.${dataApi} = function(elem, name) {
        const data = dataFor(elem);
        return name ? data[name] : data;
      };
      window.jQuery = window.$ = jQuery;
    })();
  `;

  const setUpJQueryLikePage = async (inspectedPage: InspectedPage, dataApi: '_data'|'data', withOnclick: boolean) => {
    await inspectedPage.goToHtml(`
      <button id="node">Inspect Me</button>
      <script>${jQueryLikeFramework(dataApi)}</script>
      <script>
        window.calls = [];
        const node = $('#node')[0];
        $('#node').click(function firstJQuery() { calls.push('first jquery'); });
        $('#node').click(function secondJQuery() { calls.push('second jquery'); });
        node.addEventListener('click', function addEventListenerHandler() { calls.push('addEventListener'); });
        ${withOnclick ? 'node.onclick = function onclickHandler() { calls.push(\'onclick\'); };' : ''}
      </script>
    `);
  };

  it('resolves jQuery listeners stored via jQuery._data and hides the jQuery dispatcher',
     async ({devToolsPage, inspectedPage}) => {
       await setUpJQueryLikePage(inspectedPage, '_data', /* withOnclick */ false);
       await selectNodeWithPartialText(devToolsPage, '"node">');
       await openEventListenersPaneAndWaitForListeners(devToolsPage);
       await waitForDisplayedEventListenerNames(devToolsPage, ['click']);

       const rows = await expandListenerGroup(devToolsPage, 'click', 4);
       assert.deepEqual(rows.map(row => [row.origin, row.hidden]), [
         ['Framework', true],
         ['Raw', false],
         ['FrameworkUser', false],
         ['FrameworkUser', false],
       ]);
       const visibleRows = rows.filter(row => !row.hidden);
       assert.deepEqual(visibleRows.map(row => [handlerName(row), row.properties['useCapture']]), [
         ['addEventListenerHandler', 'false'],
         ['firstJQuery', 'true'],
         ['secondJQuery', 'true'],
       ]);

       // Without resolving framework listeners the dispatcher is shown instead of the jQuery handlers.
       await devToolsPage.click(RESOLVE_FRAMEWORK_LISTENERS_SELECTOR);
       await devToolsPage.waitForFunction(async () => {
         const rows = await getListenerRows(devToolsPage, 'click');
         return rows.map(row => `${row.origin}:${row.hidden}`).join() ===
             'Framework:false,Raw:false,FrameworkUser:true,FrameworkUser:true';
       });
     });

  it('resolves jQuery listeners stored via jQuery.data and removes them via the framework',
     async ({devToolsPage, inspectedPage}) => {
       await setUpJQueryLikePage(inspectedPage, 'data', /* withOnclick */ true);
       await selectNodeWithPartialText(devToolsPage, '"node">');
       await openEventListenersPaneAndWaitForListeners(devToolsPage);
       await waitForDisplayedEventListenerNames(devToolsPage, ['click']);

       const rows = await expandListenerGroup(devToolsPage, 'click', 5);
       assert.deepEqual(rows.map(row => [row.origin, row.hidden]), [
         ['Framework', true],
         ['Raw', false],
         ['Raw', false],
         ['FrameworkUser', false],
         ['FrameworkUser', false],
       ]);
       assert.deepEqual(rows.filter(row => !row.hidden).map(row => [handlerName(row), row.properties['useCapture']]), [
         ['addEventListenerHandler', 'false'],
         ['onclickHandler', 'false'],
         ['firstJQuery', 'true'],
         ['secondJQuery', 'true'],
       ]);

       // Remove all visible listeners, including the jQuery ones which are removed via jQuery(node).off().
       for (let remaining = 4; remaining > 0; --remaining) {
         await devToolsPage.click(
             `${listenerTypeSelector('click')} + ol > li:not(.hidden) devtools-button[title="Delete event listener"]`);
         await devToolsPage.waitForFunction(
             async () =>
                 (await getListenerRows(devToolsPage, 'click')).filter(row => !row.hidden).length === remaining - 1);
       }
       await devToolsPage.waitForNone(EVENT_LISTENERS_SELECTOR);

       // None of the handlers is invoked anymore and jQuery dropped its dispatcher. This is checked in the page
       // rather than by refreshing the pane, since a refresh would still be in flight when the test ends.
       const {calls, hasDispatcher} = await inspectedPage.evaluate(() => {
         const w = window as unknown as JQueryLikeWindow;
         const node = document.getElementById('node');
         node?.click();
         return {calls: w.calls, hasDispatcher: Boolean(node && w.jQuery.data(node).handle)};
       });
       assert.deepEqual(calls, []);
       assert.isFalse(hasDispatcher);
     });

  it('resolves event listeners registered on elements inside an about:blank iframe',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
        <iframe id="blank-frame" src="about:blank" style="width:200px;height:200px;border:0"></iframe>
        <script>
          const frame = document.getElementById('blank-frame');
          frame.contentDocument.body.style.margin = '0';
          frame.contentDocument.body.innerHTML =
              '<button id="blank-btn" style="width:100%;height:100%">Blank</button>';
          const btn = frame.contentDocument.getElementById('blank-btn');
          btn.addEventListener('hover', () => {}, {capture: true, once: true});
          frame.contentDocument.body.addEventListener('wheel', () => {}, {passive: true});
        </script>
      `);
       await waitForElementsStyleSection(devToolsPage, undefined);
       await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
       await inspectedPage.click('#blank-frame');
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'blank-btn');
       await openEventListenersPaneAndWaitForListeners(devToolsPage);
       await devToolsPage.waitForFunction(async () => {
         const names = await getDisplayedEventListenerNames(devToolsPage);
         return names.includes('hover') && names.includes('wheel');
       });
     });
});
