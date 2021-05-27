import { exclude } from './exclude'

const template = () => html`
  <style>
    .heading {
      color: blue;
    }
  </style>
  <h1 class="heading">${title}</h1>
  <ul>
    ${items.map(item => {
      return getHTML()`
        <li>${item}</li>
      `
    })}
  </ul>
`

export { exclude, template }
