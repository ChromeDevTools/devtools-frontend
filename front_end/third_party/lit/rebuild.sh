set -e
npm install
vpython3 ../../../third_party/typescript/typescript.py --ignoreConfig --skipLibCheck -d -t esnext -m esnext --moduleResolution bundler src/*
node_modules/rollup/dist/bin/rollup -c
rm -rf node_modules src/*.js src/*.d.ts
# Because there's a bug in clang causing it to reformat import lists even where formatting is disabled, run it right away
git cl format --js
