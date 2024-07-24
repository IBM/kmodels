FROM node:20.9.0-alpine

# For labels
ARG GIT_COMMIT=unspecified

# Controller labels
LABEL git-commit=${GIT_COMMIT}

# App location
ARG HOME=/home/node

# Create app directory
WORKDIR $HOME/kc

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Bundle app source
COPY . .

# Install
RUN npm --only=prod --unsafe-perm install

ENTRYPOINT [ "node", "index.js" ]