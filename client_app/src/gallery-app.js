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
    message: 'Hello Vue!',
      user: {
        id: null,
        nick: null
      }
  },
    methods: {
      signIn: function(event) {
          console.log("sign in")
          this.$data.user = {id: "12345", nick: "azazaz"}
      },
      signOut: function(event) {
          console.log("sign out")
          this.$data.user = {}
      }
    },
    template: `
    <div class="container">
    
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">Gallery</a>
          </div>
          <div id="navbar" class="navbar-collapse collapse">
            <ul class="nav navbar-nav navbar-right">
              <p v-if="user.id && user.nick" class="navbar-text">{{user.nick}}</p>
              <li><a v-if="!user.id" v-on:click="signIn" href="#">Sign in</a></li>
              <li><a v-if="user.id" v-on:click="signOut" href="#">Sign out</a></li>
            </ul>
          </div>
        </div>
      </nav>

      <div class="jumbotron">
        <h1>No public content</h1>
        <p>Sign in to view the gallery content</p>
      </div>
    

    </div>
    `
}).$mount("#app")

app.$data.user = {id: "2314", nick: "alala"}

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
