FROM node:lts-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


FROM nginx:stable-alpine as production-stage
LABEL maintainer="daihaorui <Dai_Haorui@163.com>"
RUN rm /etc/nginx/nginx.conf && rm /usr/share/nginx/html/index.html
RUN mkdir -p /usr/share/nginx/html/beancount-trans-frontend
COPY conf/nginx.conf /etc/nginx/
COPY --from=build-stage /app/dist /usr/share/nginx/html/beancount-trans-frontend

EXPOSE 80
CMD [ "nginx" ]
