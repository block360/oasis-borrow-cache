FROM node:12.22.12-alpine3.15
EXPOSE 3001

RUN apk update && apk add --no-cache bash git

# @todo: no docker layer caching
WORKDIR /app
COPY . /app

RUN yarn --frozen-lockfile
ENV NODE_ENV=production
RUN yarn build