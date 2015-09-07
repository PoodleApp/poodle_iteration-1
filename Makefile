.PHONY: all build clean run typecheck

SRC = $(shell find src)

all: build

build: node_modules $(SRC)
	node_modules/.bin/babel src \
		--out-dir lib \
		--source-maps

watch:
	node_modules/.bin/babel src \
		--out-dir lib \
		--source-maps \
		--watch

clean:
	rm -rf lib

run: node_modules build
	node_modules/.bin/electron .

typecheck: node_modules
	node_modules/.bin/flow

node_modules: package.json
	npm install
	cd node_modules/keytar; \
		HOME=~/.electron-gyp \
		node-gyp rebuild --target=0.29.1 --arch=x64 --dist-url=https://atom.io/download/atom-shell
	cd node_modules/pouchdb/node_modules/leveldown; \
		HOME=~/.electron-gyp \
		node-gyp rebuild --target=0.29.1 --arch=x64 --dist-url=https://atom.io/download/atom-shell
