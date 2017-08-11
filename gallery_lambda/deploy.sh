#!/bin/sh

ASSEMBLY_FILE=fileb://./target/scala-2.12/gallery-lambda-assembly-0.1-SNAPSHOT.jar
#To be overriden in config.sh:
#example: --profile=my_profile
AWS_PROFILE=
LAMBDA_LOCATION_S3=s3://some_bucket_name
LAMBDA_FUNCTION_NAME=sample

. ./config.sh

echo Building the app ...
sbt assembly
#echo Deploying to $LAMBDA_LOCATION_S3 ...
#aws $AWS_PROFILE s3 cp $ASSEMBLY_FILE $LAMBDA_LOCATION_S3 --acl public-read
echo Deploying to $LAMBDA_FUNCTION_NAME ...
aws $AWS_PROFILE lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file $ASSEMBLY_FILE
echo Deploy complete