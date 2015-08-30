.PHONY: all build clean run typecheck

SRC = $(shell find src)

all: build

build: node_modules $(SRC)
	node_modules/.bin/babel src \
		--out-dir lib \
		--source-maps

clean:
	rm -rf lib

run: node_modules build
	node_modules/.bin/electron .

typecheck: node_modules
	node_modules/.bin/flow

node_modules: package.json
	npm install

