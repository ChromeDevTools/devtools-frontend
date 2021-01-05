/**
 * @fileoverview mouse-events-have-key-events
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/mouse-events-have-key-events.js');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  settings: { litHtmlSources: false },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});

ruleTester.run('mouse-events-have-key-events', rule, {
  valid: [
    { code: 'html`<div></div>;`' },
    { code: 'html`<div @mouseover=${foo} @focus=${foo}></div>;`' },
    { code: 'html`<div @mouseover=${handleMouseOver} @focus=${handleFocus}></div>`' },
    { code: 'html`<div @blur=${() => {}}></div>`' },
    { code: 'html`<div @focus=${() => {}}></div>`' },
    { code: 'html`<div @mouseout=${foo} @blur=${foo}></div>`' },
    { code: 'html`<div @mouseout=${handleMouseOut} @blur=${handleOnBlur}></div>`' },

    {
      code: 'html`<custom-button></custom-button>;`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
    {
      code: 'html`<custom-button @mouseover=${foo} @focus=${foo}></custom-button>;`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
    {
      code:
        'html`<custom-button @mouseover=${handleMouseOver} @focus=${handleFocus}></custom-button>`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
    {
      code: 'html`<custom-button @blur=${() => {}}></custom-button>`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
    {
      code: 'html`<custom-button @focus=${() => {}}></custom-button>`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
    {
      code: 'html`<custom-button @mouseout=${foo} @blur=${foo}></custom-button>`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
    {
      code:
        'html`<custom-button @mouseout=${handleMouseOut} @blur=${handleOnBlur}></custom-button>`',
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
  ],

  invalid: [
    {
      code: 'html`<div @mouseover=${foo}></div>;`',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseover', keyevent: 'focus' },
        },
      ],
    },
    {
      code: 'html`<div @mouseout=${foo}></div>`',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
    },
    {
      code: 'html`<div @mouseover=${foo}></div>`',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseover', keyevent: 'focus' },
        },
      ],
    },
    {
      code: 'html`<div @mouseout=${foo}></div>`',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
    },
    {
      code: 'html`<div @mouseout=${foo} @mouseover=${bar}></div>`',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseover', keyevent: 'focus' },
        },
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
    },

    {
      code: 'html`<custom-button @mouseout=${foo}></custom-button>`;',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
      options: [{ allowCustomElements: false }],
    },
    {
      code: 'html`<custom-button @mouseout=${foo} @mouseover=${bar}></custom-button>`;',
      options: [{ allowCustomElements: false }],
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseover', keyevent: 'focus' },
        },
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
    },

    {
      code: 'html`<custom-button @mouseout=${foo}></custom-button>`;',
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
      options: [{ allowCustomElements: false, allowList: ['another-button'] }],
    },
    {
      code: 'html`<custom-button @mouseout=${foo} @mouseover=${bar}></custom-button>`;',
      options: [{ allowCustomElements: false, allowList: ['another-button'] }],
      errors: [
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseover', keyevent: 'focus' },
        },
        {
          messageId: 'mouseEventsHaveKeyEvents',
          data: { mouseevent: 'mouseout', keyevent: 'blur' },
        },
      ],
    },
  ],
});
