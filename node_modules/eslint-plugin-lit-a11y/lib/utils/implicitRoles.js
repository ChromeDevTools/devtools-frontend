const { hasAttr } = require('./utils.js');

const implicitRoles = {
  a: attributes => {
    if (hasAttr(attributes, 'href')) {
      return 'link';
    }

    return '';
  },
  area: attributes => {
    if (hasAttr(attributes, 'href')) {
      return 'link';
    }

    return '';
  },
  article: () => 'article',
  aside: () => 'complementary',
  body: () => 'document',
  button: () => 'button',
  datalist: () => 'listbox',
  details: () => 'group',
  dialog: () => 'dialog',
  dl: () => 'list',
  h1: () => 'heading',
  h2: () => 'heading',
  h3: () => 'heading',
  h4: () => 'heading',
  h5: () => 'heading',
  h6: () => 'heading',
  hr: () => 'separator',
  img: attributes => {
    const alt = hasAttr(attributes, 'alt');

    if (alt && attributes.alt === '') {
      return '';
    }

    return 'img';
  },
  input: attributes => {
    const type = hasAttr(attributes, 'type');

    if (type) {
      const value = attributes.type || '';

      switch (typeof value === 'string' && value.toUpperCase()) {
        case 'BUTTON':
        case 'IMAGE':
        case 'RESET':
        case 'SUBMIT':
          return 'button';
        case 'CHECKBOX':
          return 'checkbox';
        case 'RADIO':
          return 'radio';
        case 'RANGE':
          return 'slider';
        case 'EMAIL':
        case 'PASSWORD':
        case 'SEARCH': // with [list] selector it's combobox
        case 'TEL': // with [list] selector it's combobox
        case 'URL': // with [list] selector it's combobox
        default:
          return 'textbox';
      }
    }

    return 'textbox';
  },
  li: () => 'listitem',
  link: attributes => {
    if (hasAttr(attributes, 'href')) {
      return 'link';
    }

    return '';
  },
  menu: attributes => {
    const type = hasAttr(attributes, 'type');

    if (type) {
      const value = attributes.type;

      return value && value.toUpperCase() === 'TOOLBAR' ? 'toolbar' : '';
    }

    return '';
  },
  menuitem: attributes => {
    const type = hasAttr(attributes, 'type');

    if (type) {
      const value = attributes.type || '';

      switch (typeof value === 'string' && value.toUpperCase()) {
        case 'COMMAND':
          return 'menuitem';
        case 'CHECKBOX':
          return 'menuitemcheckbox';
        case 'RADIO':
          return 'menuitemradio';
        default:
          return '';
      }
    }

    return '';
  },
  meter: () => 'progressbar',
  nav: () => 'navigation',
  ol: () => 'list',
  option: () => 'option',
  output: () => 'status',
  progress: () => 'progressbar',
  section: () => 'region',
  select: () => 'listbox',
  tbody: () => 'rowgroup',
  textarea: () => 'textbox',
  tfoot: () => 'rowgroup',
  thead: () => 'rowgroup',
  ul: () => 'list',
};

module.exports = {
  implicitRoles,
};
