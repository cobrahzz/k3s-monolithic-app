FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# build-tools needed to compile better-sqlite3 native addon on Alpine
RUN apk add --no-cache python3 make g++ && \
    npm install --production && \
    apk del python3 make g++

COPY . .

# /data will be provided by the PVC at runtime
USER node

EXPOSE 3000

CMD ["node", "server.js"]
