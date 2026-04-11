FROM node:18-alpine
WORKDIR /usr/src/app
COPY . .
RUN npm install --production
EXPOSE 5000
CMD ["node", "index.js"]
