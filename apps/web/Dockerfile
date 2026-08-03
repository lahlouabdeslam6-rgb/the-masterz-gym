FROM node:20-alpine
WORKDIR /workspace
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm install
COPY apps/web apps/web
COPY packages packages
WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

