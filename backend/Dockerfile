FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

ENV PORT=3000
EXPOSE $PORT

CMD ["npm", "start"]
