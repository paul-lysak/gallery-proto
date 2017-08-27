import Vue from "vue";
import GalleryService from "./gallery-service";

export default Vue.component("image-viewer", {
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



