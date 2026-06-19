# Sử dụng hình ảnh Node.js chính thức làm nền tảng
FROM node:18-alpine

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy các file quản lý thư viện vào trước để cache
COPY package*.json ./

# Cài đặt các thư viện (dependencies)
RUN npm install

# Copy toàn bộ code còn lại vào container
COPY . .

# Hugging Face Spaces mặc định chạy ở cổng 7860
ENV PORT=7860
EXPOSE 7860

# Lệnh để khởi chạy ứng dụng
CMD ["npm", "start"] 
