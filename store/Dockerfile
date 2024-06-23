# Pull official base image
FROM python:3.12-slim

# For labels
ARG GIT_COMMIT=unspecified
ARG BUILD_DATE=unspecified

# Controller labels
LABEL git-commit=${GIT_COMMIT}
LABEL build-date=${BUILD_DATE}

# Upgrade pip version
RUN pip install --upgrade pip

# Install requirements
COPY requirements.txt .
RUN python3 -m pip install -r \
    requirements.txt --quiet --no-cache-dir \
    && rm -f requirements.txt

WORKDIR /home

# Group ownership and file permission
RUN chgrp -R 0 /home && \
    chmod -R g=u /home

# Runtime user compatibility with Kubernetes
USER 1001

COPY --chown=1001:0 ./templates templates
COPY --chown=1001:0 ./app app

# See https://fastapi.tiangolo.com/deployment/docker/
CMD ["uvicorn", "--app-dir", "/home/app", "main:app", "--host", "0.0.0.0", "--port", "3001"]