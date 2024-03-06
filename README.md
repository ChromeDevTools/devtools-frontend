# rn-chrome-devtools-frontend

Source code for React Native's debugger frontend, based on Chrome DevTools. This project is periodically compiled and checked into the React Native repo as [`@react-native/debugger-frontend`](https://github.com/facebook/react-native/tree/main/packages/debugger-frontend).

This repository is a fork of [ChromeDevTools/devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend).

## Development

### Initial setup

1. Install [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) (ensuring your `PATH` is updated).

2. This repository must be located inside a gclient workspace directory. Run the `setup.sh` script to perform this one-time step (which will relocate the repo folder).

    ```sh
    # Using `source` will enable the script to change dir in your shell
    source setup.sh
    ```

### Build-and-run options

1. Build continuously with a file watcher:

    ```sh
    npm run watch
    ```

1. Build with the default config once:

    ```sh
    npm run build
    ```

1. Build with the release config once:

    ```sh
    npm run build-release
    ```

This can then be served from a static web server to test locally:

```sh
python3 -m http.server 8000 --directory out/Default/gen/front_end
```

The frontend will be available at `http://localhost:8000/inspector.html` (or `http://localhost:8000/rn_inspector.html` for the RN-specific entry point).

## Contributing

### Project documentation

Check out the [project documentation](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/README.md)
for instructions to set up, use, and maintain a DevTools front-end checkout, as well as design guidelines, and architectural
documentation.

### Additional references

- DevTools documentation: [devtools.chrome.com](https://devtools.chrome.com/)
- [Debugging protocol docs](https://developer.chrome.com/devtools/docs/debugger-protocol) and [Chrome Debugging Protocol Viewer](https://chromedevtools.github.io/debugger-protocol-viewer/)
- [awesome-chrome-devtools](https://github.com/paulirish/awesome-chrome-devtools): recommended tools and resources
- Contributing to DevTools: [bit.ly/devtools-contribution-guide](https://goo.gle/devtools-contribution-guide)
- Contributing To Chrome DevTools Protocol: [docs.google.com](https://goo.gle/devtools-contribution-guide-cdp)
- DevTools Design Review Guidelines: [design_guidelines.md](docs/design_guidelines.md)

---

### [Code of Conduct](https://code.fb.com/codeofconduct)

Meta has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.fb.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### [Contributing guide](https://github.com/facebookexperimental/rn-chrome-devtools-frontend/blob/main/CONTRIBUTING.md)

Read the [contributing guide](https://github.com/facebookexperimental/rn-chrome-devtools-frontend/blob/main/CONTRIBUTING.md) to learn about our development process.

## License

This project extends the BSD 3-Clause license from [ChromeDevTools/devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend/blob/main/LICENSE), viewable in the LICENSE file.
