.PHONY: all clean

all: static/js/index.js

clean:
	rm -rf static/js/

node_modules: package.json
	npm install

static/js/index.js: index.js $(shell find lib) webpack.config.js node_modules
	node_modules/.bin/webpack --config webpack.config.js
