FROM node:lts-alpine AS build-stage

# 使用国内 npm 镜像源并放宽超时/重试，避免 CI 构建时 npm 访问 registry.npmjs.org 超时
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build


FROM nginx:stable-alpine AS production-stage
LABEL maintainer="daihaorui <Dai_Haorui@163.com>"
RUN rm /etc/nginx/nginx.conf && rm /usr/share/nginx/html/index.html
RUN mkdir -p /usr/share/nginx/html/beancount-trans-frontend
COPY conf/nginx.conf /etc/nginx/
COPY --from=build-stage /app/dist /usr/share/nginx/html/beancount-trans-frontend

EXPOSE 80
CMD [ "nginx" ]
