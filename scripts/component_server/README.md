# Components dev server

This server serves up examples of the web components built within DevTools and provides a useful way to document various states of components.

For more background, see the [initial proposal and design doc](https://docs.google.com/document/d/1P6qtACf4aryfT9OSHxNFI3okMKt9oUrtzOKCws5bOec/edit?pli=1).

To add an example for your component:

1. Create `front_end/component_docs/DIR` where `DIR` is the name of your component.
2. Within the new `DIR`, add HTML files. Each one of these is a standalone example. You should name the HTML file based on what it's documenting, e.g. `basic.html` or `data-missing.html`. This file should import your component and render it with the data you need.
3. Update `front_end/component_docs/BUILD.gn` to add each of your `*.html` files to the `sources` array. You will also need to update the `deps` array to ensure the component examples depend on your component's source file.
4. Run `npm run components-server` to fire up a server on `localhost:8090`. You should now see your component listed and you can click on the link to view the examples.
5. **Note**: the server assumes your built target is `Default`. If not, run the server and pass the `--target` flag: `npm run components-server -- --target=Release`.
