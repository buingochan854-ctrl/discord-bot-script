FROM node:20-bullseye

WORKDIR /app

# Cài FFmpeg + Python + yt-dlp
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip && \
    pip3 install --break-system-packages yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Copy package trước để cache npm
COPY package*.json ./

RUN npm install

# Copy source
COPY . .

# Tạo thư mục tải video
RUN mkdir -p downloads

# Chạy bot
CMD ["npm", "start"]