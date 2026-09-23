FROM nginx:1.27-alpine

# Configuration nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Page de la pétition
COPY public/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
