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

Vue.component("sign-in-dialog", {
    props: [],
    template: `
    <div>TODO: sign in</div>
    `

})

Vue.component("sign-in-controls", {
    props: [],
    methods: {
        signIn: function(event) {
            console.log("ctrls sign in", this.$data.login, this.$data.password)
            event.preventDefault();//avoid form submission warnings
            //TODO actual logic of password validation
            if(this.$data.password == "123") {
                this.$emit("signedIn", {id: "id:"+this.$data.login, nick: "nick:"+this.$data.login})
            } else {
                console.error("Incorrect login or password")
            }
        }
    },
    data: function() {
        return {
            login: "",
            password: ""
        }
    },
    template: `
      <form class="navbar-form navbar-right">
        <div class="form-group">
          <input type="text" class="form-control" placeholder="Login" v-model:value="login"/>
          <input type="text" class="form-control" placeholder="Password" v-model:value="password"/>
        </div>
        <button type="submit" class="btn btn-default" v-on:click="signIn">Sign In</button>
      </form>
    `
})


var app = new Vue({
  data: {
    message: 'Hello Vue!',
      user: {
        id: null,
        nick: null
      }
      // ,
      // dialogs: {signIn: false}
  },
    methods: {
      // signIn: function(event) {
      //     console.log("sign in")
      //     this.$data.dialogs.signIn = true
      //     this.$data.user = {id: "12345", nick: "azazaz"}
      // },

    signedIn: function(event) {
        console.log("Signed in", event)
            this.$data.user = event;
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
          <sign-in-controls v-if="!user.id" v-on:signedIn="signedIn"></sign-in-controls>
          <div id="navbar" class="navbar-collapse collapse">
            <ul class="nav navbar-nav navbar-right">
              <p v-if="user.id && user.nick" class="navbar-text">{{user.nick}}</p>
              <li><a v-if="user.id" v-on:click="signOut" href="#">Sign out</a></li>
            </ul>
          </div>
        </div>
      </nav>

      <div class="jumbotron">
        <h1>No public content</h1>
        <p>Sign in to view the gallery content</p>
      </div>
      
      <!--<sign-in-dialog v-if="dialogs.signIn"></sign-in-dialog>-->
    

    </div>
    `
}).$mount("#app")

// app.$data.user = {id: "2314", nick: "alala"}

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
