FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    nginx \
    && apt-get upgrade -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install pdo pdo_pgsql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-interaction --optimize-autoloader || echo "Aucune dépendance à installer"

RUN mkdir -p /var/www/public

RUN echo 'server {\n\
    listen 80 default_server;\n\
    server_name _;\n\
    root /var/www/public;\n\
    index index.php;\n\
    \n\
    location / {\n\
        try_files $uri /index.php$is_args$args;\n\
    }\n\
    \n\
    location ~ ^/index\.php(/|$) {\n\
        fastcgi_pass 127.0.0.1:9000;\n\
        fastcgi_split_path_info ^(.+\.php)(/.*)$;\n\
        include fastcgi_params;\n\
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;\n\
        internal;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

RUN rm -f /etc/nginx/sites-enabled/default

COPY entrypoint.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 80

CMD ["/usr/local/bin/start.sh"]


# On dirait que la base de données n'a pas été générée, comment faire pour qu'elle le soit dès que l'on start les conteneurs (pour la première fois du coup) ? 
# Par ailleurs, comment faire en sorte que le problème de doc vierge