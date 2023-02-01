FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
# docker caches and checks if anything changed in these files and determines if need to RUN yarn
COPY package*.json ./
COPY yarn.lock ./

RUN yarn

COPY . .
# copy in custom env variables into .env
COPY .env.production .env

RUN yarn build

ENV NODE_ENV production

EXPOSE 8080
CMD [ "node", "dist/index.js" ]
USER node