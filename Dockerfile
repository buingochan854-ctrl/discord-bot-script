# ==========================
# Dockerfile
# Discord Bot (Node.js 20)
# ==========================

FROM node:20-bookworm

# Thư mục làm việc
WORKDIR /app

# Cài FFmpeg và Python3 (Bắt buộc cho yt-dlp-exec)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy package trước để cache
COPY package*.json ./

# Cài dependencies
RUN npm install

# Copy toàn bộ source
COPY . .

# Kiểm tra cú pháp JS trước khi build
RUN node --check index.js

# Tạo thư mục tạm/tải về
RUN mkdir -p downloads

# Biến môi trường
ENV NODE_ENV=production

# Chạy bot
CMD ["npm", "start"]
