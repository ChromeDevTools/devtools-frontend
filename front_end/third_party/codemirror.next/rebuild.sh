npm install
../../../node_modules/.bin/tsc -d -t esnext -m esnext --moduleResolution node bundle.ts
../../../node_modules/@rollup/wasm-node/dist/bin/rollup -c
rm -rf node_modules bundle.js bundle.d.ts
# Because there's a bug in clang causing it to reformat import lists even where formatting is disabled, run it right away
git cl format --js
