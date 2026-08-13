# Reproducible build: pinned base image digest-free tag, no secrets baked in,
# CGO disabled so the binary is static and its hash depends only on this
# Dockerfile + go.sum - the exact input /api/attest/proof's codeVersionHash
# commits to.
FROM golang:1.25-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/enclave ./cmd/enclave

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /out/enclave /app/enclave
COPY Dockerfile /app/Dockerfile
ENV SIMULATED_TEE=true
# LISTEN_ADDR is intentionally not set here - config.go binds to $PORT when
# set (Render/Heroku-style PaaS convention), falling back to :8000 otherwise.
EXPOSE 8000
ENTRYPOINT ["/app/enclave"]
