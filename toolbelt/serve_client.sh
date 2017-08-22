#!/bin/sh

MY_PATH="`dirname \"$0\"`"
. $MY_PATH/config.sh

cd $MY_PATH/../client_app
#node_modules/.bin/http-server
npm run dev-server --no-inline

