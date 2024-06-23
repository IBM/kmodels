FROM python:3.11-slim

# For MAC M1 uncomment this lines
# RUN apt-get update \
#     && apt-get -y install gcc python3-dev

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip -r requirements.txt

WORKDIR /home/app

# Group ownership and file permission
RUN chgrp -R 0 /home && \
    chmod -R g=u /home

# Runtime user compatibility with Kubernetes
USER 1001

COPY . .

ENTRYPOINT ["python", "model.py"]
