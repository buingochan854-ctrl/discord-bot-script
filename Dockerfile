FROM node:20-bullseye

WORKDIR /app

RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        wget && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p downloads

CMD ["npm","start"]