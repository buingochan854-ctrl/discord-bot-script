# ==========================
# Dockerfile
# Discord Bot (Node.js 20)
# ==========================

FROM node:20-bookworm

# Thư mục làm việc
WORKDIR /app

# Cài FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copy package trước để cache
COPY package*.json ./

# Cài dependencies
RUN npm install

# Copy toàn bộ source
COPY . .

# ==========================
# DEBUG SYNTAX
# ==========================

RUN echo "========== TRY ==========" && \
    grep -n "try" index.js || true

RUN echo "========== CATCH ==========" && \
    grep -n "catch" index.js || true

RUN echo "========== LINE 1000-1090 ==========" && \
    nl -ba index.js | sed -n '1000,1090p'

# Kiểm tra cú pháp
RUN node --check index.js

# ==========================
# Runtime
# ==========================

# Tạo thư mục cần thiết
RUN mkdir -p downloads

# Biến môi trường
ENV NODE_ENV=production

# Chạy bot
CMD ["npm", "start"]