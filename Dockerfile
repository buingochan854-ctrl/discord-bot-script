FROM node:22-alpine

WORKDIR /app

# Cài Python, pip và ffmpeg
RUN apk add --no-cache python3 py3-pip ffmpeg

# Cài yt-dlp
RUN pip3 install --break-system-packages yt-dlp

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=10000

EXPOSE 10000

CMD ["npm", "start"]
