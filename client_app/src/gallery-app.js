import {Config, CognitoIdentityCredentials} from "aws-sdk";
 import {
  CognitoUser,
  CognitoUserPool,
 AuthenticationDetails,
  // CognitoUserAttribute
 } from "amazon-cognito-identity-js";
import appConfig from "./config";
import Vue from "vue";

import Toaster from 'v-toaster'
import 'v-toaster/dist/v-toaster.css'
Vue.use(Toaster, {timeout: 5000})

import "./style.css"

import "bootstrap/dist/css/bootstrap.css"

console.log("hi, there!", appConfig)

// Config.region = appConfig.region;
// Config.credentials = new CognitoIdentityCredentials({
//   IdentityPoolId: appConfig.IdentityPoolId
// });



// Vue.component("sign-in-dialog", {
//     props: [],
//     template: `
//     <div>TODO: sign in</div>
//     `
// })

    var userPool = new CognitoUserPool({
      UserPoolId: appConfig.UserPoolId,
      ClientId: appConfig.ClientId,
    });


function authenticate(login, password) {
    var authenticationData = {
        Username : login,
        Password : password,
    };
    var authenticationDetails = new AuthenticationDetails(authenticationData);


    var userData = {
        Username : login,
        Pool : userPool
    };
    var cognitoUser = new CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            Vue.prototype.$toaster.info('Logged in successfully');
            var jwtToken = result.getAccessToken().getJwtToken();
            console.log('successful login', result, jwtToken);

            //POTENTIAL: Region needs to be set if not already set previously elsewhere.
            AWS.config.region = appConfig.region;

            /*
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId : appConfig.IdentityPoolId,
                Logins : {
                    // Change the key below according to the specific region your user pool is in.
                    'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>' : result.getIdToken().getJwtToken()
                }
            });
            */

            // Instantiate aws sdk service objects now that the credentials have been updated.
            // example: var s3 = new AWS.S3();

        },

        onFailure: function(err) {
            console.log('sign in failed', err);
            Vue.prototype.$toaster.error('Sign in failed: '+err);
        },

    });
}

Vue.component("sign-in-controls", {
    props: [],
    methods: {
        signIn: function(event) {
            console.log("ctrls sign in", this.$data.login, this.$data.password)
            event.preventDefault();//avoid form submission warnings
            authenticate(this.$data.login, this.$data.password)
            /*
            //TODO actual logic of password validation
            if(this.$data.password == "123") {
                this.$emit("signedIn", {id: "id:"+this.$data.login, nick: "nick:"+this.$data.login});
            } else {
                this.$toaster.error('Incorrect login or password');
            }
            */
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
          <input type="password" class="form-control" placeholder="Password" v-model:value="password"/>
        </div>
        <button type="submit" class="btn btn-default" v-on:click="signIn">Sign In</button>
      </form>
    `
})


var app = new Vue({
  data: {
    message: 'Hello Vue!',
      user: {
        anonymous: false,
        id: null,
        nick: null
      }
  },
  methods: {
    signedIn: function(event) {
        console.log("Signed in", event)
            this.$data.user = event;
            this.$data.user.anonymous = false;
        },
      signOut: function(event) {
          console.log("sign out");
          user.signOut();
          this.$data.user = {anonymous: true};
      }
    },
    template: `
    <div class="container">
    
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">Gallery</a>
          </div>
          <sign-in-controls v-if="user.anonymous" v-on:signedIn="signedIn"></sign-in-controls>
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

//TODO move to separate module
function resolveCurrentUser() {
    var pAnonymous = new Promise(function (resolve, reject) {resolve({
        anonymous: true,
        id: null,
        nickname: null
    })})


    var user = userPool.getCurrentUser();

    if (user == null) {
        pAnonymous
    } else {
        var pSession = new Promise(function (resolve, reject) {
            user.getSession(function (err, res) {
                if (err) reject(err);
                else resolve(res);
            })
        });


        var pAttrs = pSession.then(function (res) {
            return new Promise(function (resolve, reject) {
                user.getUserAttributes(function (err, res) {
                    if (err) reject(err);
                    else resolve(res);
                })
            });
        })

        var pAttrs = pAttrs.then(function (res) {
            return new Promise(function (resolve, reject) {
                var nickAttr = res.find(el => {return el.Name == "nickname";})
                console.log("attrs for user", user, res)
                if (nickAttr) resolve({
                    anonymouse: false,
                    id: user.username,
                    nickname: nickAttr.Value
                })
                else reject("User has no nickname attribute")
            })
        })

        return pAttrs.then(undefined,
            function (err) {
                console.warn("Couldn't get user attributes, clearing current user", err);
                user.signOut();
                return pAnonymous;
            })

    }
}

resolveCurrentUser().then(function(user) {
    app.$data.user = user;
})

// var userPool = new CognitoUserPool({
//   UserPoolId: appConfig.UserPoolId,
//   ClientId: appConfig.ClientId,
// });

//successfully created a user with this:
//     var attributeList = [
//             new CognitoUserAttribute({
//             Name : 'nickname',
//             Value : 'sampleUser'
//         })
//     ]

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
