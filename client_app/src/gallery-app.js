import UserService from "./user-service";
import GalleryService from "./gallery-service";
import Vue from "vue";

import Toaster from 'v-toaster'
import 'v-toaster/dist/v-toaster.css'
Vue.use(Toaster, {timeout: 5000})


import "bootstrap/dist/css/bootstrap.css"

import appConfig from "./config";

import SplitPane from 'vue-split-pane'


Vue.component("split-pane", SplitPane)


//tmp
 import {
  CognitoUser,
  CognitoUserPool,
 AuthenticationDetails,
 } from "amazon-cognito-identity-js";

import "./style.css"

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


function pathLastElement(path) {
    const elements = path.split("/").filter(el => el.length > 0)
    if(elements.length == 0)
        return path;
    else
        return elements.pop()
}

Vue.component("gallery-tree", {
    props: ["folder", "defaultExpand"],
    data: function() {
        return {
            expanded: !!this.defaultExpand,
            subfolders: undefined
        };
    },
    computed: {
        caption: function () {
            return this.folder == "/" ? "Gallery" : pathLastElement(this.folder);
        }
    },
    methods: {
        fetchConditionally: function() {
            const that = this;
            const prefix = this.folder == "/" ? "/" : this.folder + "/";
            if(this.expanded && this.subfolders === undefined)
                GalleryService.list(this.folder).then(function(res) {
                    that.subfolders = res.folders.map(f => prefix + f);
                })
        },
        toggle: function () {
            this.expanded = !this.expanded;
            this.fetchConditionally();
        },
        select: function() {
            this.$emit("folderSelected", this.folder)
        },
        forwardSelect: function (folder) {
            this.$emit("folderSelected", folder)
        }
    },
    created: function () {
        this.fetchConditionally();
    },
    template: `
    <div>
      <div >
        <span @click="toggle" v-if="expanded" class="icon expand-icon glyphicon glyphicon-minus"></span> 
        <span @click="toggle" v-if="!expanded" class="icon expand-icon glyphicon glyphicon-plus"></span>
        <span @click="select" class="tree-item-caption">{{caption}}</span>
      </div>
      <ul v-show="expanded">
        <li v-for="sf in subfolders" class="tree-item">
            <gallery-tree :folder="sf" v-on:folderSelected="forwardSelect"></gallery-tree>
        </li>
      </ul>
    </div>
    `
})

Vue.component("gallery-folder", {
    props: ["folder"],
    data: function() {
        return {files: undefined}
    },
    methods: {
        isLoading: function() {
            return this.files === undefined;
        },
        isEmpty: function() {
            return this.files !== undefined && this.files.length == 0;
        },
        nonEmpty: function() {
            return this.files !== undefined && this.files.length > 0;
        },
        refreshFiles: function() {
            const that = this;
            this.files = undefined;
            // setTimeout(function() {that.files = [that.folder+"/TODO1", that.folder+"/TODO2"]}, 1000)
            GalleryService.list(this.folder).then(function(folderContent) {
                that.files = folderContent.files;
            })
        },
        downloadFile: function(file) {
            const url = GalleryService.preSign(this.folder, file)
            const win = window.open(url, '_blank');
            win.focus();
        }
    },
    watch: {
        folder: function(newFolder) {
            console.log("folder updated", this.folder, newFolder)
            this.refreshFiles();
        }
    },
    created: function() {
        this.refreshFiles();
    },
    template: `
    <div>
        <h4>{{folder}}</h4>
        <div v-if="isLoading()">Loading...</div>
        <div v-if="isEmpty()">No files</div>
        <div v-if="nonEmpty()" class="gallery-thumbnail-container">
            <div v-for="f in files" @click="downloadFile(f)" class="gallery-thumbnail">{{f}}</div>
        </div>
    </div>
    `
})

Vue.component("gallery-content", {
    data: function() {
        return {
            selectedFolder: "/"
        }
    },
  methods: {
      folderSelected: function(folder) {
          console.log("folder selected", folder)
          this.selectedFolder = folder;
      }
  },
  template:
      `<div class="container">
        <split-pane>
          <section slot="left">
            <gallery-tree :folder="'/'" :defaultExpand="true" v-on:folderSelected="folderSelected"></gallery-tree>
          </section>
          <section slot="right">
            <gallery-folder :folder="selectedFolder"></gallery-folder>
          </section>
        </split-pane>
        </div>
      </div>`
})



Vue.component('splash', {
  template: `<div class="jumbotron">
        <h1>No public content</h1>
        <p>Sign in to view the gallery content</p>
      </div>`
})


function tc() {
    const lambdaBase = "http://d3qtwt9vcn2ml2.cloudfront.net/galleryLambda"

    // const userPool = new CognitoUserPool({
    //   UserPoolId: appConfig.UserPoolId,
    //   ClientId: appConfig.ClientId,
    // });
    // const user = userPool.getCurrentUser();
    // console.log("current user=", user)
    // const token = user.getSignInUserSession().getIdToken().getJwtToken()
    const token = localStorage.getItem("CognitoIdentityServiceProvider.2m43b0gnfhesg3kbaut67g9g9k.4ba5cc50-f799-4271-a83e-ad2fe5c63d3d.idToken")
    const url = "https://d3qtwt9vcn2ml2.cloudfront.net/gallerylambdaa"

    console.log("requesting cookies with token ", token, url)
    const req = new XMLHttpRequest()
    req.open("GET", url, false)
    req.setRequestHeader("Authorization", token)
    req.withCredentials = true
    req.send()
    console.log("Done requesting cookies")

    // const preq = new XMLHttpRequest()
    // const purl = "http://d3qtwt9vcn2ml2.cloudfront.net/selected_album/2008_Paul/dsc_1275.jpg"
    // preq.open("GET", purl, false)
    // preq.send()
    // console.log("Done requesting picture")
}

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
          this.$data.bodyComponent = "gallery-content"
          // awsDemo()
      },
      signOut: function (event) {
          console.log("sign out");
          UserService.signOut();
          this.$data.user = UserService.anonymousUser;
      },
      testCookies: function(event) {
          console.log("TODO: test cookies")
          tc()
      }
  },
    // coponents: {
    //
    // }
  template: `
    <div class="container">
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">Gallery</a>
          </div>
          <sign-in-controls v-if="user.anonymous" v-on:signedIn="userResolved"></sign-in-controls>
          <div id="navbar" class="navbar-collapse collapse">
            <input type="button" v-on:click="testCookies" value="Test Cookies"/>
            <ul class="nav navbar-nav navbar-right">
              <p v-if="user.id && user.nick" class="navbar-text">{{user.nick}}</p>
              <li><a v-if="user.id" v-on:click="signOut" href="#">Sign out</a></li>
            </ul>
          </div>
        </div>
      </nav>


    <component v-bind:is="bodyComponent"></component>

    </div>
    `
}).$mount("#app")



UserService.resolveCurrentUser().then(function(user) {
    app.userResolved(user)
})

