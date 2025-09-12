FROM node:20-slim
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=8080 NODE_ENV=production
CMD ["npm", "start"]
