import Vue from "vue";
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import "bootstrap/dist/css/bootstrap.css"

window.jQuery = require("jquery")
const bootstrap = require("bootstrap/dist/js/bootstrap")

import SplitPane from 'vue-split-pane'

Vue.component("split-pane", SplitPane)

import UserService from "./user-service";
import GalleryService from "./gallery-service";
import U from "./utils";

import "./image-viewer";
import "./gallery-tree";
import "./gallery-folder";
import "./user-details-dialog";
import T from "./gallery-toaster"

import "./style.css"

Vue.component("sign-in-controls", {
    props: [],
    methods: {
        signIn: function(event) {
            const that = this;
            event.preventDefault();//to avoid form submission warnings
            UserService.authenticate(this.$data.login, this.$data.password).then(function(user) {
                that.$data.login = ""
                that.$data.password = ""
                that.$emit("signedIn", user);
            }, function(err) {
                if(err.hasOwnProperty("error") && err.error == "NEW_PASSWORD_REQUIRED") {
                    that.$emit("newPasswordRequired", err);
                } else {
                    T.error("Couldn't sign in: " + err);
                }
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


const GalleryContent = Vue.component("gallery-content", {
  computed: {
        selectedFolder: function() {
            return this.$route.params.folder;
        }
    },
  methods: {
      folderSelected: function(folder) {
          console.debug("folder selected", folder, this.$route.params)
          router.push({name: "folders", params: {folder: folder}})
      },
      fileSelected: function(file) {
          this.$refs.image_viewer.showFile(this.selectedFolder, file)
      }
  },
  template:
      `<div class="">
        <image-viewer ref="image_viewer"/>
        <split-pane v-show="true">
          <section slot="left">
            <gallery-tree :folder="'/'" :defaultExpand="true" :selectedFolder="selectedFolder" v-on:folderSelected="folderSelected"></gallery-tree>
          </section>
          <section slot="right">
            <gallery-folder :folder="selectedFolder"  v-on:fileSelected="fileSelected"></gallery-folder>
          </section>
        </split-pane>
      </div>`
})

const router = new VueRouter({
    routes: [
        {path: "/folders/:folder", name: "folders", component: GalleryContent},
        {path: "/folders", redirect: "/folders/%2F"},
        {path: "/", redirect: "/folders/%2F"}
    ]
})

const AuthenticatedContent = Vue.component('authenticated-content', {
  router: router,
  template: `<router-view></router-view>`
})

const Splash = Vue.component('splash', {
  template: `<div class="jumbotron">
        <h1>No public content</h1>
        <p>Sign in to view the gallery content</p>
      </div>`
})

var app = new Vue({
  data: {
    message: 'Hello Vue!',
      user: {
        anonymous: false,
        id: null,
        nick: null
      },
      bodyComponent: "splash",
      testLink: null
  },
  methods: {
      userResolved: function (user) {
          this.$data.user = user;
          if(!!this.$data.user.id) this.authenticated()
      },
      authenticated: function() {
          this.$data.bodyComponent = "authenticated-content"
      },
      captureUserDetails(event) {
          console.log("TODO capture user details", event)
          this.$refs.userDetailsDialog.captureUserDetails(event.cognitoUser)
      },
      signOut: function (event) {
          console.log("sign out");
          UserService.signOut();
          this.bodyComponent = "splash"
          this.user = UserService.anonymousUser;
      }
  },
  // router: router,
  template: `
    <div class="container">
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">Gallery</a>
          </div>
          <sign-in-controls v-if="user.anonymous" v-on:signedIn="userResolved" v-on:newPasswordRequired="captureUserDetails"></sign-in-controls>
          <div id="navbar" class="navbar-collapse collapse">
            <ul class="nav navbar-nav navbar-right">
              <p v-if="user.id && user.nick" class="navbar-text">{{user.nick}}</p>
              <li><a v-if="user.id" v-on:click="signOut" href="#">Sign out</a></li>
            </ul>
          </div>
        </div>
      </nav>

      <component v-bind:is="bodyComponent"></component>

      <user-details-dialog ref="userDetailsDialog"/>
    </div>`
}).$mount("#app")



UserService.resolveCurrentUser().then(
    user => { app.userResolved(user)},
    err => {
        console.error("failed to resolved user", err)
        T.error(err)
        app.userResolved(UserService.anonymousUser)
    })

