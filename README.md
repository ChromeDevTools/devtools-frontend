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

### Syncing with the upstream repo

Periodically, we will sync this project with the upstream [ChromeDevTools/devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend) repo. We always update our fork from a stable upstream branch.

#### Viewing the last synced version

```sh
git tag --merged <branch>
```

#### Performing a repo sync

1. (One-time prerequisite) Add a Git remote pointing to [ChromeDevTools/devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend).

    ```sh
    git remote add chromedevtools git@github.com:ChromeDevTools/devtools-frontend.git
    ```

    > Note: The `chromedevtools` naming is optional — `upstream` will typically be set already when originally cloning your local repo with `gh repo clone`.

2. Merge with the target `chromedevtools` branch, then resolve all conflicts(!).

    ```sh
    git switch -c repo-sync # Create a new branch for the repo sync PR
    git rebase upstream/main # Ensure your local branch is up-to-date
    git fetch --all
    git merge chromedevtools/chromium/5845
    ```

3. Submit and merge your PR.
4. Tag the merge commit! This marks the point at which we synced the repo with the upstream branch.

    ```sh
    git tag sync-chromium-5845
    ```

## Contributing

### Project documentation

Check out the [project documentation](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/README.md)
for instructions to [set up](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md), use, and
maintain a DevTools front-end checkout, as well as design guidelines, and architectural documentation.

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
