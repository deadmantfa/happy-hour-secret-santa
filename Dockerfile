# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built application
COPY --from=build /app/dist /tmp/dist
# Move the content to html, handling both flat and nested (browser/) structures
RUN sh -c 'if [ -d "/tmp/dist/browser" ]; then cp -r /tmp/dist/browser/* /usr/share/nginx/html/; else cp -r /tmp/dist/* /usr/share/nginx/html/; fi'
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
