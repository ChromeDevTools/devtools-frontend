// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../../../front_end/ui/lit-html/lit-html.js';

import {renderElementIntoDOM} from './DOMHelpers.js';
import {TEXT_NODE, withMutations, withNoMutations} from './MutationHelpers.js';

const {assert} = chai;

/**
 * Needed because assert.throws from chai does not work async.
 */
async function assertThrowsAsync(fn: () => Promise<void>, errorMessage: string) {
  let caught = false;
  try {
    await fn();
  } catch (e) {
    caught = true;
    assert.strictEqual(e.message, errorMessage);
  }

  if (!caught) {
    assert.fail('Expected error but got none.');
  }
}

async function assertNotThrowsAsync(fn: () => Promise<void>) {
  let errorMessage = '';
  try {
    await fn();
  } catch (e) {
    errorMessage = e.message;
  }

  if (errorMessage) {
    assert.fail(`Expected no error but got:\n${errorMessage}`);
  }
}

describe('MutationHelpers', () => {
  describe('withMutations', () => {
    it('fails if there are no mutations', async () => {
      const div = document.createElement('div');
      await assertThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
            }],
            div, () => {});
      }, 'Expected at least one mutation for ADD/REMOVE div, but got 0');
    });

    it('allows up to 10 mutations unless specified', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertNotThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
            }],
            div, () => {
              for (let i = 0; i < 10; i++) {
                div.appendChild(document.createElement('div'));
              }
            });
      });
    });

    it('errors if there are >10 mutations', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
            }],
            div, () => {
              for (let i = 0; i < 11; i++) {
                div.appendChild(document.createElement('div'));
              }
            });
      }, 'Expected no more than 10 mutations for ADD/REMOVE div, but got 11');
    });

    it('lets the user provide the max', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
              max: 5,
            }],
            div, () => {
              for (let i = 0; i < 6; i++) {
                div.appendChild(document.createElement('div'));
              }
            });
      }, 'Expected no more than 5 mutations for ADD/REMOVE div, but got 6');
    });

    it('supports a max of 0', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
              max: 0,
            }],
            div, () => {
              div.appendChild(document.createElement('div'));
            });
      }, 'Expected no more than 0 mutations for ADD/REMOVE div, but got 1');
    });

    it('supports checking multiple expected mutations', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withMutations(
            [
              {
                target: 'div',
                max: 1,
              },
              {target: 'span', max: 0},
            ],
            div, () => {
              div.appendChild(document.createElement('div'));
              div.appendChild(document.createElement('span'));
            });
      }, 'Expected no more than 0 mutations for ADD/REMOVE span, but got 1');
    });

    it('errors if other unexpected mutations occur', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
              max: 1,
            }],
            div, () => {
              // this is OK as we are expecting one div mutation
              div.appendChild(document.createElement('div'));
              // not OK - we have not declared any span mutations
              div.appendChild(document.createElement('span'));
            });
      }, 'Additional unexpected mutations were detected:\nspan: 1 addition');
    });

    it('lets you declare any expected text updates', async () => {
      const div = document.createElement('div');
      const renderList = (list: string[]) => {
        const html = LitHtml.html`${list.map(l => LitHtml.html`<span>${l}</span>`)}`;
        LitHtml.render(html, div);
      };

      renderElementIntoDOM(div);
      renderList(['a', 'b']);

      await assertNotThrowsAsync(async () => {
        await withMutations(
            [
              {
                target: 'div',
              },
              {target: TEXT_NODE},
            ],
            div, div => {
              renderList(['b', 'a']);
              div.appendChild(document.createElement('div'));
            });
      });
    });

    it('fails if there are undeclared text updates', async () => {
      const div = document.createElement('div');
      const renderList = (list: string[]) => {
        const html = LitHtml.html`${list.map(l => LitHtml.html`<span>${l}</span>`)}`;
        LitHtml.render(html, div);
      };

      renderElementIntoDOM(div);
      renderList(['a', 'b']);

      await assertThrowsAsync(async () => {
        await withMutations(
            [{
              target: 'div',
            }],
            div, div => {
              renderList(['b', 'a']);
              div.appendChild(document.createElement('div'));
            });
      }, 'Additional unexpected mutations were detected:\nTEXT_NODE: 2 updates');
    });
  });

  describe('withNoMutations', () => {
    it('fails if there are DOM additions', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withNoMutations(div, element => {
          const child = document.createElement('span');
          element.appendChild(child);
        });
      }, 'Expected no mutations, but got 1: \nspan: 1 addition');
    });

    it('fails if there are DOM removals', async () => {
      const div = document.createElement('div');
      const child = document.createElement('span');
      div.appendChild(child);
      renderElementIntoDOM(div);

      await assertThrowsAsync(async () => {
        await withNoMutations(div, element => {
          element.removeChild(child);
        });
      }, 'Expected no mutations, but got 1: \nspan: 1 removal');
    });

    it('correctly displays multiple unexpected mutations', async () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      await assertThrowsAsync(async () => {
        await withNoMutations(div, element => {
          const child = document.createElement('span');
          element.appendChild(child);
          element.removeChild(child);
          element.appendChild(document.createElement('p'));
          element.appendChild(document.createElement('p'));
          element.appendChild(document.createElement('p'));
        });
      }, 'Expected no mutations, but got 5: \nspan: 1 addition, 1 removal\np: 3 additions');
    });

    it('fails if there are text re-orderings', async () => {
      const div = document.createElement('div');
      const renderList = (list: string[]) => {
        const html = LitHtml.html`${list.map(l => LitHtml.html`<span>${l}</span>`)}`;
        LitHtml.render(html, div);
      };

      renderElementIntoDOM(div);
      renderList(['a', 'b']);

      await assertThrowsAsync(async () => {
        await withNoMutations(div, () => {
          renderList(['b', 'a']);
        });
      }, 'Expected no mutations, but got 2: \nTEXT_NODE: 2 updates');
    });

    it('fails if there are text re-orderings and DOM additions', async () => {
      const div = document.createElement('div');
      const renderList = (list: string[]) => {
        const html = LitHtml.html`${list.map(l => LitHtml.html`<span>${l}</span>`)}`;
        LitHtml.render(html, div);
      };

      renderElementIntoDOM(div);
      renderList(['a', 'b']);

      await assertThrowsAsync(async () => {
        await withNoMutations(div, div => {
          renderList(['b', 'a']);
          div.appendChild(document.createElement('ul'));
        });
      }, 'Expected no mutations, but got 3: \nTEXT_NODE: 2 updates\nul: 1 addition');
    });
  });
});
