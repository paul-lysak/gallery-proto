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

    const res = new Promise(function(resolve, reject) {
        creds.get(function(err) {
            if(err)
                reject("Failed to get AWS credentials: "+err)
            else
                resolve(creds)
        })
    })

    res.then(() => console.debug("Got AWS credentials", AWS.config.credentials))
    return res
}

function setUpContentCookies(idToken) {
    console.debug("requesting cookies with token ", idToken, appConfig.contentCookiesEndpoint)
    const req = new XMLHttpRequest()
    req.open("GET", appConfig.contentCookiesEndpoint, true)
    req.setRequestHeader("Authorization", idToken)
    req.withCredentials = true

    const res = new Promise(function(resolve, reject) {
        req.addEventListener("load", event => resolve("TODO"))
        req.addEventListener("error", (event) => {
            console.error("Cookies creation error", event)
            reject("Failed to get content authentication cookies")
        })
    })
    req.send()

    res.then(ok => console.debug("Successfully received content authentication cookies"),
        err => console.error("Failed to get content authentication cookies", err))
    return res
}

function userInfo(user) {
    const pAttrs = new Promise(function (resolve, reject) {
            user.getUserAttributes(function (err, res) {
                if (err) reject(err);
                else resolve(res);
            })
        });

    const pAfterService = pAttrs.then(function(res) {
        return Promise.all([setUpAWS(user),
            setUpContentCookies(user.getSignInUserSession().getIdToken().getJwtToken())])
            .then(() => res)
    })

    return pAfterService.then(function (res) {
        console.debug("Got user attributes", res)
        const nickAttr = res.find(el => {return el.Name == "nickname";})

        if (nickAttr) return Promise.resolve({
            anonymouse: false,
            id: user.username,
            nick: nickAttr.Value
        })
        else return Promise.reject("User has no nickname attribute")
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
                },
                newPasswordRequired: function(userAttrs, requiredAttrs) {
                    // console.log("NPR", userAttrs, requiredAttrs)
                    // cognitoUser.completeNewPasswordChallenge(newPassword, attributesData, this)
                    reject({error: "NEW_PASSWORD_REQUIRED", userAttributes: userAttrs, requiredAttributes: requiredAttrs, cognitoUser: cognitoUser})
                }
            })
        });
        return pSession.then(function (res) {return userInfo(cognitoUser)});
    },

    finishRegistration: function(cognitoUser, nickname, password) {
        return new Promise(function(resolve, reject) {
            cognitoUser.completeNewPasswordChallenge(password, {nickname: nickname}, {
                onSuccess: (session) => resolve(session),
                onFailure: (err) => reject(err)
            })
        })
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

            const pUserInfo= pSession.then(function (res) {
                console.log("Identified the user", user)
                return userInfo(user)
            })

            return pUserInfo.then(undefined,
                function (err) {
                    console.warn("Couldn't get user attributes, clearing current user", err);
                    // user.signOut();
                    return pUserInfo
                })
        }
    },

    signOut: function() {
        userPool.getCurrentUser().signOut();
    }
};

export default UserService;
