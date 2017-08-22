#!/bin/sh
set -e

#To be overriden in config.sh:
#example: --profile=my_profile
AWS_PROFILE=
APP_LOCATION_S3=s3://some_bucket_name

MY_PATH="`dirname \"$0\"`"
. $MY_PATH/config.sh

cd $MY_PATH/../client_app
echo Building the app ...
npm run build
echo Deploying to $APP_LOCATION_S3 ...
aws $AWS_PROFILE s3 sync dist $APP_LOCATION_S3 --acl public-read
echo Deploy complete

