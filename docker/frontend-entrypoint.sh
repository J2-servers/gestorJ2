#!/bin/sh
set -e

BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-backend:3333}"

sed \
  -e "s#__BACKEND_UPSTREAM__#${BACKEND_UPSTREAM}#g" \
  /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "==> Frontend Gestor J2 listening on 80, 8080, 3000, 5173 and 4173; proxy /api -> ${BACKEND_UPSTREAM}"
exec nginx -g "daemon off;"
