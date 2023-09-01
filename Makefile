registry?=exposr
node_version=18.17.1
alpine_version=3.18
platforms?=linux/amd64,linux/arm64,linux/arm/v7

project:=exposr
version=$(shell [ -e build.env ] && . ./build.env 2> /dev/null && echo $${EXPOSR_BUILD_VERSION} || git describe --tags --always --dirty 2> /dev/null || git rev-parse --short HEAD)
commit=$(shell [ -e build.env ] && . ./build.env 2> /dev/null && echo $${EXPOSR_BUILD_GIT_COMMIT} || git rev-parse --short HEAD)
package_name=$(project)-$(version).tgz

all: package.build.container bundle.build.container image.build

define docker.run
	docker run --rm -i \
		-u $(shell id -u):$(shell id -g) \
		-v ${PWD}:/workdir \
		$(project)-builder \
		$1 $2 $3 $4 $5 $6 $7 $8 $9
endef

# Wraps any call and runs inside builder container
%.container: builder.build
	$(call docker.run, make $(subst .container,,$@))

build: bundle.build

dist/exposr-$(version).tgz:
	make package.build.container

package.build:
	yarn install --no-default-rc --frozen-lockfile
	mkdir -p dist
	yarn pack --no-default-rc --frozen-lockfile --filename dist/$(package_name)

bundle.build:
	yarn install --no-default-rc --frozen-lockfile
	yarn run build
	yarn run bundle
	rm src/console/components/*.js

dist.clean:
	rm -fr dist

# Builder image
builder.build:
	docker build \
		--progress plain \
		--build-arg NODE_VERSION=$(node_version) \
		--build-arg ALPINE_VERSION=$(alpine_version) \
		-t $(project)-builder \
		--target builder \
		.

image.build: dist/exposr-$(version).tgz
	docker build \
		-f Dockerfile \
		--progress plain \
		--build-arg NODE_VERSION=${node_version} \
		--build-arg ALPINE_VERSION=${alpine_version} \
		--build-arg VERSION=${version} \
		--build-arg DIST_SRC=dist/exposr-$(version).tgz \
		--label "org.opencontainers.image.source=https://github.com/exposr/exposr" \
		--label "org.opencontainers.image.version=$(version)" \
		--label "org.opencontainers.image.revision=$(commit)" \
		--label "org.opencontainers.image.description=exposr version $(version) commit $(commit)" \
		-t $(registry)/$(project):$(version) \
		.

ifneq (, $(publish))
push_flag=--push
endif
image.xbuild:
	docker buildx create --name exposr-builder --driver docker-container || true
	docker buildx build \
		--builder exposr-builder \
		-f Dockerfile \
		--progress plain \
		--platform $(platforms) \
		$(push_flag) \
		--build-arg NODE_VERSION=${node_version} \
		--build-arg ALPINE_VERSION=${alpine_version} \
		--build-arg VERSION=${version} \
		--build-arg DIST_SRC=dist/exposr-$(version).tgz \
		--label "org.opencontainers.image.source=https://github.com/exposr/exposr" \
		--label "org.opencontainers.image.version=$(version)" \
		--label "org.opencontainers.image.revision=$(commit)" \
		--label "org.opencontainers.image.description=exposr version $(version) commit $(commit)" \
		-t $(registry)/$(project):$(version) \
		.

image.xbuild.latest:
	docker buildx imagetools create --tag $(registry)/$(project):latest $(registry)/$(project):$(version)

image.xbuild.unstable:
	docker buildx imagetools create --tag $(registry)/$(project):unstable $(registry)/$(project):$(version)

.PHONY: builder.build image.build image.buildx image.xbuild.latest image.xbuild.unstable
