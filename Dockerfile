FROM node:20-bullseye

WORKDIR /app

RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        yt-dlp && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p downloads

CMD ["npm","start"]