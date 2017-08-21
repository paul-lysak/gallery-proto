#!/bin/sh

AWS_PROFILE=
USER_POOL_ID=some_pool
. ./config.sh

USERNAME=$1
PASSWORD=$2
NICKNAME=$3

#aws cognito-idp admin-create-user --user-pool-id $USER_POOL_ID --username $USERNAME --user-attributes Name=nickname,Value=$NICKNAME --temporary-password tmp_pwd
