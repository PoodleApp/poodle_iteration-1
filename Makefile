.PHONY: all build clean

src_files = $(shell find src -name '*.js')
out_files = $(patsubst src/%,build/%,$(src_files))
map_files = $(patsubst src/%.js,build/%.js,$(src_files))

all: build

build: node_modules $(sort $(dir $(out_files))) $(out_files)

build/%.js: src/%.js
	babel $< --out-file $@ --source-maps

%/:
	mkdir -p $@

clean:
	rm -rf build

node_modules: package.json
	npm install
