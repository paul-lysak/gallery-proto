#!/bin/sh

set -e

#To be overriden in config.sh:
#example: --profile=my_profile
AWS_PROFILE=
CF_BUCKET=sample

. ./config.sh

echo Building the app ...
sbt assembly
echo Packaging for CloudFormation ...
aws $AWS_PROFILE cloudformation package \
   --template-file galleryResizeLambda.yaml \
   --output-template-file cf-output.yaml \
   --s3-bucket $CF_BUCKET
echo Packaging complete
