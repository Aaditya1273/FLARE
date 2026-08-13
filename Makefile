.PHONY: test test-contracts test-extension test-keeper build-frontend deploy-coston2 run-enclave run-keeper run-frontend

test: test-contracts test-extension test-keeper build-frontend

test-contracts:
	forge test -vv

test-extension:
	cd extension && go vet ./... && go test ./... -race

test-keeper:
	cd keeper && npm test

build-frontend:
	cd frontend && npm run build

deploy-coston2:
	forge script script/Deploy.s.sol:DeployScript --rpc-url $$COSTON2_RPC --broadcast

run-enclave:
	cd extension && go run ./cmd/enclave

run-keeper:
	cd keeper && npm start

run-frontend:
	cd frontend && npm run dev
