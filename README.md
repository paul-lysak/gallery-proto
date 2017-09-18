# gallery-proto

It's a prototype of a gallery which displays a tree of private folder on S3 and pictures in selected folder. 
Uses Cognito for user management, Lambda for resizing the pictures, CloudFront for caching and restricting access to content. 
UI is written with Vue.js, lambda functions - in Scala.

## TODO: documentation

I didn't have a time yet to write a comprehensive documentation, if you're interested in running this gallery
on your own AWS account - please rise an issue and I'll try to clarify the things for you.

## How to set up permissions

Role for Cognito user may be taken from identity pool settings (not to mess with user pool) - there's
one role for all authenticated users, and one for all non-authenticated.
In order to take role from user group (specified in user pool) need to set 
identity pool/dashboard/authentication providers/cognito/Authenticated role selection to "Choose from token".
"Use default role" will use the same role for all users.


Role is cached in identity in identity pool, so changes may not be reflected immediately. 
May need to delete identity from identity pool, then clean up browser storage, then log in again
in order to create fresh identity from the same user.
