npm install
../../../third_party/esbuild/esbuild --bundle package/lib/index.js --format=esm --outdir=lib
rm -rf node_modules
# Because there's a bug in clang causing it to reformat import lists even where formatting is disabled, run it right away
git cl format --js
