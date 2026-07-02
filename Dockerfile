FROM node:20-bookworm

WORKDIR /app

# Cài FFmpeg + Python + pip
RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        python3-pip && \
    python3 -m pip install --break-system-packages -U yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Copy package
COPY package*.json ./

# Cài package Node.js
RUN npm install

# Copy source
COPY . .

# Thư mục lưu video tạm
RUN mkdir -p downloads

# Port Render
EXPOSE 10000

# Khởi động bot
CMD ["npm", "start"]