#
REGISTRY ?= docker.io
TAG ?= 1.0.1
DOCKER ?= docker

# Image labels
LABEL_GIT_COMMIT = $(shell git log -1 --format=%h)

all: build push

build:
	${DOCKER} build -t ${REGISTRY}/kmodels/kc:${TAG} . \
		--build-arg GIT_COMMIT=${LABEL_GIT_COMMIT}

push:
	${DOCKER} push ${REGISTRY}/kmodels/kc:${TAG}

clean:
	${DOCKER} rmi -f ${REGISTRY}/kmodels/kc:${TAG}

.PHONY: all build push clean
