GOPATH  = $(shell pwd)
PKG_DIR = src/sec-ctl

DB_PASSWORD := secctl_dev123

GO_TEST := go test -timeout 60s

.PHONY: all clean db pkg

all: local cloud mock

pkg:
	docker build -t sec-ctl-pkg -f $(PKG_DIR)/pkg/Dockerfile $(PKG_DIR)

local: pkg
	docker build -t sec-ctl-local -f $(PKG_DIR)/local/Dockerfile $(PKG_DIR)

cloud: pkg db
	docker build -t sec-ctl-cloud -f $(PKG_DIR)/cloud/Dockerfile $(PKG_DIR)

db:
	docker build --build-arg=DB_PASSWORD=$(DB_PASSWORD) -t sec-ctl-db db

mock: pkg
	docker build -t sec-ctl-mock -f $(PKG_DIR)/mock/Dockerfile $(PKG_DIR)

test: test-pkg test-cloud

test-pkg: pkg
	docker-compose -f docker-compose.test.yml up pkg

test-db-run:
	docker-compose up -d test-cloud-db  test-cloud-redis

test-db-rebuild: db
	docker rm  -f secctl_test-cloud-db_1
	$(MAKE) test-db-run

test-cloud: test-db-run
	$(GO_TEST) sec-ctl/cloud/...
