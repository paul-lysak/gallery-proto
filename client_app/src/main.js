// import {Config, CognitoIdentityCredentials} from "aws-sdk";
 import {
//   CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute
 } from "amazon-cognito-identity-js";
import appConfig from "./config";
import Vue from "vue";

import "./style.css"

import "bootstrap/dist/css/bootstrap.css"

console.log("hi, there!", appConfig)

// Config.region = appConfig.region;
// Config.credentials = new CognitoIdentityCredentials({
//   IdentityPoolId: appConfig.IdentityPoolId
// });

//TODO nicer way to append components programmatically
document.body.innerHTML =
    ` Hi there, dynamic gallery!

    <div class="st1">styled div</div>

<div id="app">
</div>
    `

var app = new Vue({
  data: {
    message: 'Hello Vue!'
  },
    template: `
    <div id="app">
      {{ message }}
    </div>
    `
}).$mount("#app")

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

/*
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
    */
