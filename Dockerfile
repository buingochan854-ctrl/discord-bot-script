FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN apt-get update && \
    apt-get install -y ffmpeg python3 && \
    rm -rf /var/lib/apt/lists/*

RUN npm install

COPY . .

RUN mkdir -p downloads

ENV NODE_ENV=production

CMD ["npm","start"]
