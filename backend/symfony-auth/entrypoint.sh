#!/bin/bash
set -e

mkdir -p /var/www/var/cache /var/www/var/log /var/www/config/jwt
chown -R www-data:www-data /var/www/var /var/www/config/jwt

if [ ! -f /var/www/config/jwt/private.pem ] || [ ! -f /var/www/config/jwt/public.pem ]; then
    su -s /bin/sh www-data -c "php bin/console lexik:jwt:generate-keypair --skip-if-exists"
fi

su -s /bin/sh www-data -c "php bin/console doctrine:migrations:migrate --no-interaction || true"
su -s /bin/sh www-data -c "php bin/console assets:install --symlink --relative || true"

php-fpm -D
nginx -g "daemon off;"