# FROM node:20
FROM node:20

# For labels
ARG GIT_COMMIT=unspecified
ARG BUILD_DATE=unspecified

# Controller labels
LABEL git-commit=${GIT_COMMIT}
LABEL build-date=${BUILD_DATE}

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Bundle app source
COPY . .

RUN npm --only=prod --unsafe-perm install

EXPOSE 8080
CMD [ "node", "index.js" ]