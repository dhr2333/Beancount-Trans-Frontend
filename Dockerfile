FROM harbor.dhr2333.cn:8080/library/nginx:1.23.1
LABEL maintainer="daihaorui <Dai_Haorui@163.com>"

RUN rm /etc/nginx/nginx.conf && rm /usr/share/nginx/html/index.html
RUN mkdir -p /usr/share/nginx/html/beancount-trans-frontend
ADD conf/nginx.conf /etc/nginx/
ADD dist/ /usr/share/nginx/html/beancount-trans-frontend

EXPOSE 80
CMD [ "nginx" ]
