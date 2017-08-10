import {Config, CognitoIdentityCredentials} from "aws-sdk";
 import {
  CognitoUser,
  CognitoUserPool,
 AuthenticationDetails,
  // CognitoUserAttribute
 } from "amazon-cognito-identity-js";
import appConfig from "./config";

const userPool = new CognitoUserPool({
  UserPoolId: appConfig.UserPoolId,
  ClientId: appConfig.ClientId,
});

const anonymousUser = {
                anonymous: true,
                id: null,
                nickname: null
            };


function setUpAWS(user) {
    const logins = {}
    const token = user.getSignInUserSession().getIdToken().getJwtToken()
    const loginKey = "cognito-idp." + appConfig.region + ".amazonaws.com/" + appConfig.UserPoolId
    logins[loginKey] = token
    const creds = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: appConfig.IdentityPoolId,
        Logins : logins
    });

    AWS.config.region = appConfig.region;
    AWS.config.credentials = creds
}

function userInfo(user) {
    var pAttrs = new Promise(function (resolve, reject) {
            user.getUserAttributes(function (err, res) {
                if (err) reject(err);
                else resolve(res);
            })
        });

    return pAttrs.then(function (res) {
        return new Promise(function (resolve, reject) {
            var nickAttr = res.find(el => {return el.Name == "nickname";})

            setUpAWS(user)

            if (nickAttr) resolve({
                anonymouse: false,
                id: user.username,
                nick: nickAttr.Value
            })
            else reject("User has no nickname attribute")
        })
    })
}

const UserService = {
    anonymousUser: anonymousUser,

    authenticate: function (login, password) {
        var authenticationData = {
            Username: login,
            Password: password,
        };
        var authenticationDetails = new AuthenticationDetails(authenticationData);

        var userData = {
            Username: login,
            Pool: userPool
        };
        const cognitoUser = new CognitoUser(userData);

        const pSession = new Promise(function (resolve, reject) {
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (session) {
                    var jwtToken = session.getAccessToken().getJwtToken();
                    resolve(session)

                    // AWS.config.region = appConfig.region;
                    //
                    // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    //     IdentityPoolId : appConfig.IdentityPoolId//,
                    //     // Logins : {
                    //         // Change the key below according to the specific region your user pool is in.
                    //         // 'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>' : result.getIdToken().getJwtToken()
                    //     // }
                    // });
                    //
                    // // Instantiate aws sdk service objects now that the credentials have been updated.
                    // // example: var s3 = new AWS.S3();
                    // var s3 = new AWS.S3();

                },
                onFailure: function (err) {
                    reject(err)
                }
            })
        });
        return pSession.then(function (res) {return userInfo(cognitoUser)});
    },

    resolveCurrentUser: function () {
        var pAnonymous = new Promise(function (resolve, reject) { resolve(anonymousUser) })


        var user = userPool.getCurrentUser();

        if (user == null) {
            return pAnonymous;
        } else {
            var pSession = new Promise(function (resolve, reject) {
                user.getSession(function (err, res) {
                    if (err) reject(err);
                    else resolve(res);
                })
            });

            const pUserInfo= pSession.then(function (res) {return userInfo(user)})

            return pUserInfo.then(undefined,
                function (err) {
                    console.warn("Couldn't get user attributes, clearing current user", err);
                    // user.signOut();
                    return pAnonymous;
                })
        }
    },

    signOut: function() {
        userPool.getCurrentUser().signOut();

    }
};

export default UserService;
