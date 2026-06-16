#!/bin/sh
set -e

BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-backend:3333}"

sed "s#__BACKEND_UPSTREAM__#${BACKEND_UPSTREAM}#g" \
  /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "==> Frontend Gestor J2 proxy /api -> ${BACKEND_UPSTREAM}"
exec nginx -g "daemon off;"
