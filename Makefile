.PHONY: all build clean

# Define function to recursively search directory for files matching a pattern.
rwildcard=$(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

src_files = $(call rwildcard,src/,%.js)
out_files = $(patsubst src/%,build/%,$(src_files))
out_dirs  = $(sort $(dir $(out_files)))

all: build

build: node_modules $(out_dirs) $(out_files)

build/%.js: src/%.js
	babel $< --out-file $@ --source-maps

%/:
	mkdirp $@

clean:
	rimraf build

node_modules: package.json
	npm install
