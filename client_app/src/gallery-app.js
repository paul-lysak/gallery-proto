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

var app = new Vue({
  data: {
    message: 'Hello Vue!'
  },
    template: `
    <div class="container g-center-container">

      <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Sign In - Gallery</h3>
          </div>
          <div class="panel-body">
            <form>
              <div class="form-group">
                <input type="text" class="form-control" placeholder="Username">
                <input type="password" class="form-control" placeholder="Password">
             </div>
             <button type="submit" class="btn btn-default">Sign In</button>
          </div>
      </div>
     
      <div class="panel">
          <div class="panel-body">
          {{ message }}
          </div>
      </div> 

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
