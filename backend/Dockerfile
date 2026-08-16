# Gunakan Node.js versi 22
FROM node:22-alpine

WORKDIR /app

# Salin file package.json terlebih dahulu
COPY package*.json ./

# Install dependensi
RUN npm install

# Salin sisa kode aplikasi
COPY . .

# Build aplikasi NestJS
RUN npm run build

# Backend Anda berjalan di port 3001
EXPOSE 3001

# Perintah untuk menjalankan backend
CMD ["npm", "run", "start:prod"]
