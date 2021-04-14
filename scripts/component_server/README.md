# Components dev server

This server serves up examples of the web components built within DevTools and provides a useful way to document various states of components.

For more background, see the [initial proposal and design doc](https://docs.google.com/document/d/1P6qtACf4aryfT9OSHxNFI3okMKt9oUrtzOKCws5bOec/edit?pli=1).

To add an example for your component:

1. Create `front_end/ui/components/docs/DIR` where `DIR` is the name of your component.
2. Within the new `DIR`, add HTML and TypeScript files. Each one of these is a standalone example. You should name the HTML file based on what it's documenting, e.g. `basic.html` or `data-missing.html`, and add a TypeScript file with the same name. The TypeScript file should contain all the code to import and run your component, and within the HTML file you can place any HTML or CSS you need (inline style tags are fine for examples) to render the component in the right context.
3. Create a `BUILD.gn` in your new `DIR`. This should contain the following code:

```
import("../../../scripts/build/ninja/copy.gni")
import("../../../third_party/typescript/typescript.gni")

ts_library("ts") {
  sources = [
    "basic.ts"
  ]

  deps = [
    # As an example: anything your TS code imports needs to be listed here as a dep.
    "../../ui/components/data_grid:bundle",
  ]
}

copy_to_gen("elements_breadcrumbs") {
  sources = [
    "basic.html",
    # list all other examples here
  ]

  deps = [
    ":ts"
  ]
}
```


4. Update `front_end/ui/components/docs/BUILD.gn` to add your new directory's `BUILD.GN` to the `public_deps` array.
5. Run `npm run components-server` to fire up a server on `localhost:8090`. You should now see your component listed and you can click on the link to view the examples.
6. **Note**: the server assumes your built target is `Default`. If not, run the server and pass the `--target` flag: `npm run components-server -- --target=Release`.
