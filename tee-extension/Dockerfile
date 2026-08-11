FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py policy_engine.py pmw_signer.py ./

# Reproducible build-time hash of the exact source shipped in this image, so the
# attestation returned by /api/attest/proof is verifiable against the published
# Dockerfile/source rather than trusting the running container's own claim.
RUN echo "CODE_VERSION_HASH=0x$(sha256sum app.py policy_engine.py pmw_signer.py | sha256sum | cut -d' ' -f1)" > /app/.codehash
ENV CODE_VERSION_HASH=""
RUN . /app/.codehash && echo "CODE_VERSION_HASH computed: $CODE_VERSION_HASH"

ENV SIMULATED_TEE=1
EXPOSE 8000

CMD ["sh", "-c", ". /app/.codehash && export CODE_VERSION_HASH && exec uvicorn app:app --host 0.0.0.0 --port 8000"]
