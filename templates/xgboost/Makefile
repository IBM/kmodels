# Model template
MODEL = xgboost
VERSION ?= $(shell cat VERSION)

# Image registry
REGISTRY ?= docker.io

# Image builder tool (docker/ podman etc.)
DOCKER ?= docker

all: build push build-template

build: build-kserve build-kfp

push: push-kserve push-kfp

build-kserve: build-common build-thirdparty
	cd kserve/transformer && \
		${DOCKER} build -t ${REGISTRY}/inference/${MODEL}-transformer:${VERSION} \
			--build-arg version=${VERSION} .

build-kfp: build-common build-thirdparty
	cd kfp/components/train && \
		${DOCKER} build -t ${REGISTRY}/component/${MODEL}-train:${VERSION} \
			--build-arg version=${VERSION} .

build-common:
	cd common && \
	${DOCKER} build -t ${MODEL}-common:${VERSION} .

build-thirdparty:
	cd third_party && \
	${DOCKER} build -t ${MODEL}-thirdparty:${VERSION} .

push-kserve:
	${DOCKER} push ${REGISTRY}/inference/${MODEL}-transformer:${VERSION}

push-kfp:
	${DOCKER} push ${REGISTRY}/component/${MODEL}-train:${VERSION}

build-pipeline:
	cd kfp && \
		python pipeline.py
	mv kfp/pipeline.yaml ./template/${VERSION}/pipeline

build-template: build-pipeline
	rm -f ${MODEL}.tar
	kc template pack template

clean:
	rm *.tar
	rm -rf workspace

prune: clean
	${DOCKER} rmi -f \
		${REGISTRY}/component/${MODEL}-train:${VERSION} \
		${REGISTRY}/inference/${MODEL}-transformer:${VERSION}

.PHONY: all build push build-kserve push-kserve build-kfp push-kfp build-pipeline build-template clean prune
