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

    creds.get(function() {
        console.debug("Got AWS credentials", AWS.config.credentials)
    })
}

function setUpContentCookies(idToken) {
    // const url = "https://d3qtwt9vcn2ml2.cloudfront.net/gallery/cookies"

    console.debug("requesting cookies with token ", idToken, appConfig.contentCookiesEndpoint)
    const req = new XMLHttpRequest()
    req.open("GET", appConfig.contentCookiesEndpoint, true)
    req.setRequestHeader("Authorization", idToken)
    req.withCredentials = true
    req.addEventListener("load", function() {console.debug("Successfully received content authentication cookies")});
    //TODO report this error to main app so that it could be displayed with toaster
    req.addEventListener("error", function() {console.error("Failed to get content authentication cookies")});
    req.send()
}

function userInfo(user) {
    const pAttrs = new Promise(function (resolve, reject) {
            user.getUserAttributes(function (err, res) {
                if (err) reject(err);
                else resolve(res);
            })
        });

    return pAttrs.then(function (res) {
        console.log("Got user attributes", res)
        return new Promise(function (resolve, reject) {
            setUpAWS(user)
            setUpContentCookies(user.getSignInUserSession().getIdToken().getJwtToken())

            const nickAttr = res.find(el => {return el.Name == "nickname";})

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
        const authenticationData = {
            Username: login,
            Password: password,
        };
        const authenticationDetails = new AuthenticationDetails(authenticationData);

        const userData = {
            Username: login,
            Pool: userPool
        };
        const cognitoUser = new CognitoUser(userData);

        const pSession = new Promise(function (resolve, reject) {
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (session) {
                    var jwtToken = session.getAccessToken().getJwtToken();
                    resolve(session)
                },
                onFailure: function (err) {
                    reject(err)
                }
            })
        });
        return pSession.then(function (res) {return userInfo(cognitoUser)});
    },

    resolveCurrentUser: function () {
        const pAnonymous = new Promise(function (resolve, reject) { resolve(anonymousUser) })

        const user = userPool.getCurrentUser();

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
