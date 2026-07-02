FROM node:20-bookworm

WORKDIR /app

# Copy package
COPY package*.json ./

# Cài package Node.js
RUN npm install

# Copy source
COPY . .

# Port Render
EXPOSE 10000

# Khởi động bot
CMD ["npm", "start"]
