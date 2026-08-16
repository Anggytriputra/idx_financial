# Gunakan Node.js versi 18 (versi ringan Alpine Linux)
FROM node:22-alpine

# Set folder kerja di dalam kontainer
WORKDIR /app

# Salin file package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# Install semua dependensi
RUN npm install

# Salin seluruh sisa kode aplikasi Anda ke dalam kontainer
COPY . .

# Build aplikasi Next.js (siap untuk production)
RUN npm run build

# Beri tahu Docker bahwa aplikasi ini berjalan di port 3000
EXPOSE 3000

# Perintah utama saat kontainer ini nanti dinyalakan
CMD ["npm", "start"]
