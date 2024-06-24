# Copyright contributors to the Kmodels project

ARG version=latest
FROM xgboost-common:$version as common
FROM xgboost-thirdparty:$version as thirdparty

FROM python:3.11-slim

COPY requirements.txt .
RUN python3 -m pip install -r \
    requirements.txt --quiet --no-cache-dir \
    && rm -f requirements.txt

WORKDIR /home/app

# Group ownership and file permission
RUN chgrp -R 0 /home && \
    chmod -R g=u /home

# Runtime user compatibility with Kubernetes
USER 1001

COPY --from=common /common ./common
COPY --from=thirdparty /third_party ./third_party

COPY ./src .

ENTRYPOINT python3 train.py