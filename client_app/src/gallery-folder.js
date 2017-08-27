import Vue from "vue";
import GalleryService from "./gallery-service";

export default Vue.component("gallery-folder", {
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
})

