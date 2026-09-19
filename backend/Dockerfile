FROM mcr.microsoft.com/playwright:v1.63.0-jammy
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN node node_modules/.bin/prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
