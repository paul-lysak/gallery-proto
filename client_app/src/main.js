// import {Config, CognitoIdentityCredentials} from "aws-sdk";
 import {
//   CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute
 } from "amazon-cognito-identity-js";
import appConfig from "./config";


console.log("hi, there!", appConfig)

// Config.region = appConfig.region;
// Config.credentials = new CognitoIdentityCredentials({
//   IdentityPoolId: appConfig.IdentityPoolId
// });


var userPool = new CognitoUserPool({
  UserPoolId: appConfig.UserPoolId,
  ClientId: appConfig.ClientId,
});

//successfully created a user with this:
    var attributeList = [
            new CognitoUserAttribute({
            Name : 'nickname',
            Value : 'sampleUser'
        })
    ]

    userPool.signUp('sampleUser@site.com', 'samplePassword', attributeList, null, function(err, result){
        if (err) {
            console.error("Failed to register user", err, result)
        } else {
            console.log("res", result)
            var cognitoUser = result.user;
            console.log("user", cognitoUser)
            console.log('user name is ' + cognitoUser.getUsername());
        }
    });
