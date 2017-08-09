import UserService from "./user-service";
import Vue from "vue";

import Toaster from 'v-toaster'
import 'v-toaster/dist/v-toaster.css'
Vue.use(Toaster, {timeout: 5000})

import "./style.css"

import "bootstrap/dist/css/bootstrap.css"

import appConfig from "./config";

Vue.component("sign-in-controls", {
    props: [],
    methods: {
        signIn: function(event) {
            const that = this;
            event.preventDefault();//to avoid form submission warnings
            UserService.authenticate(this.$data.login, this.$data.password).then(function(user) {
                that.$emit("signedIn", user);
            }, function(err) {
                Vue.prototype.$toaster.error("Couldn't sign in: " + err);
            })
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


function stripDir(f, parent) {
    const f1 = f.indexOf(parent) == 0 ? f.slice(parent.length) : f;
    if(f1.slice(-1) == "/") return f1.slice(0, -1);
    else return f1;
}


function listGallery(dir) {
    var s3 = new AWS.S3();
    const d = appConfig.galleryFolder + dir + "/"
    return new Promise(function (resolve, reject) {
        s3.listObjects({
            Bucket: appConfig.galleryBucket,
            Prefix: d,
            Delimiter: "/"
        }, function (err, res) {
            if (err) reject(err)
            else {
                // console.log("result", res)
                if(res.IsTruncated) console.warn("s3 response truncated, application doesn't handle it yet")
                resolve({
                    folders: res.CommonPrefixes.map(p => stripDir(p.Prefix, d)).filter(f => f.length > 0),
                    files: res.Contents.map(f => stripDir(f.Key, d)).filter(f => f.length > 0)
                })
            }
        })
    })
}

function awsDemo() {
    listGallery("").then(res => console.log("dir listing", res))
}

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
      userResolved: function (user) {
          this.$data.user = user;
          if(!!this.$data.user.id) this.authenticated()
      },
      authenticated: function() {
          awsDemo()
      },
      signOut: function (event) {
          console.log("sign out");
          UserService.signOut();
          this.$data.user = UserService.anonymousUser;
      }
  },
  template: `
    <div class="container">
    
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">Gallery</a>
          </div>
          <sign-in-controls v-if="user.anonymous" v-on:signedIn="userResolved"></sign-in-controls>
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

    </div>
    `
}).$mount("#app")



UserService.resolveCurrentUser().then(function(user) {
    app.userResolved(user)
})

