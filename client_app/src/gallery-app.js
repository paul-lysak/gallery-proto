import UserService from "./user-service";
import GalleryService from "./gallery-service";
import Vue from "vue";

import Toaster from 'v-toaster'
import 'v-toaster/dist/v-toaster.css'
Vue.use(Toaster, {timeout: 5000})


import "bootstrap/dist/css/bootstrap.css"

// import appConfig from "./config";

import SplitPane from 'vue-split-pane'

Vue.component("split-pane", SplitPane)

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
        fileUrl: function(f) {
            return GalleryService.distributionUrl(this.folder, f)
        },
        thumbnailUrl: function(f) {
            return GalleryService.thumbnailUrl(this.folder, f, 160, 160)
        },
        select: function(file) {
            this.$emit("fileSelected", file)
        }

    },
    watch: {
        folder: function(newFolder) {
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
            <div v-for="f in files" class="gallery-thumbnail" @click="select(f)">
                <div class="gallery-thumbnail-content">
                    <img :alt="f" :src="thumbnailUrl(f)"/>
                </div>
            </div>
        </div>
    </div>`

    // <div v-for="f in files" @click="downloadFile(f)" class="gallery-thumbnail">{{f}}</div>
})

Vue.component("image-viewer", {
    data: function() {
        return {
            folder: undefined,
            file: undefined,
            imageUrl: undefined
        }
    },
    computed: {
        fullSizeUrl: function() {
            return GalleryService.distributionUrl(this.folder, this.file)
        }
    },
    methods: {
        showFile: function(folder, file) {
            this.folder = folder
            this.file = file
            this.imageUrl = undefined
            const that = this
            Vue.nextTick(function() {
                const d = that.$refs.main_div
                console.log("focusing on", d, d.clientWidth, d.clientHeight, folder, file)
                that.imageUrl = GalleryService.thumbnailUrl(that.folder, that.file, d.clientWidth, d.clientHeight)
                d.focus()
            })
        },
        close: function(event) {
            console.log("close that", event)
            this.folder = undefined
            this.file = undefined
        },
        prev: function(event) {
            const that = this

            GalleryService.previousFile(this.folder, this.file).then(function(newFile) {
                if(!!newFile) {
                    that.showFile(newFile.folder, newFile.file)
                }
            })
        },
        next: function(event) {
            const that = this

            GalleryService.nextFile(this.folder, this.file).then(function(newFile) {
                if(!!newFile) {
                    that.showFile(newFile.folder, newFile.file)
                }
            })
        },
        click: function(event) {
            console.log("img click", event)
            const w = this.$refs.main_div.clientWidth
            if(event.clientX < w/2)
                this.prev(event)
            else
                this.next(event)
        }
    },
    template: `
    <div class="image-viewer" 
        v-if="folder && file" 
        @keydown.left="prev" 
        @keydown.right="next" 
        @keydown.esc="close" 
        @click="click"
        tabindex="1" ref="main_div">
      <nav class="navbar navbar-default image-viewer-navbar">
        <div class="container-fluid">
          <div class="navbar-collapse collapse">
            <ul class="nav navbar-nav navbar-center">
              <li><a :href="fullSizeUrl">{{folder}}/{{file}}</a></li>
            </ul>
            <ul class="nav navbar-nav navbar-right">
              <li><span @click="close" class="icon expand-icon glyphicon glyphicon-remove navbar-text"></span></li>
            </ul>
          </div>
        </div>
      </nav>
      <img :src="imageUrl" v-if="imageUrl" class="image-viewer-content"/>
    </div>`

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
            <gallery-tree :folder="'/'" :defaultExpand="true" v-on:folderSelected="folderSelected"></gallery-tree>
          </section>
          <section slot="right">
            <gallery-folder :folder="selectedFolder"  v-on:fileSelected="fileSelected"></gallery-folder>
          </section>
        </split-pane>
      </div>`
})



Vue.component('splash', {
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
          this.$data.bodyComponent = "gallery-content"
          // awsDemo()
      },
      signOut: function (event) {
          console.log("sign out");
          UserService.signOut();
          this.bodyComponent = "splash"
          this.user = UserService.anonymousUser;
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


    <component v-bind:is="bodyComponent"></component>

    </div>
    `
}).$mount("#app")



UserService.resolveCurrentUser().then(
    user => { app.userResolved(user)},
    err => {
        console.error("failed to resolved user", err)
        Vue.prototype.$toaster.error(err)
        app.userResolved(UserService.anonymousUser)
    })

