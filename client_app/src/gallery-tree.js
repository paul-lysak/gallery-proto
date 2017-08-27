import Vue from "vue";
import GalleryService from "./gallery-service";
import U from "./utils";

export default Vue.component("gallery-tree", {
    props: ["folder", "defaultExpand", "selectedFolder"],
    data: function() {
        return {
            expanded: this.conditionalSelected(this.folder) || !!this.defaultExpand,
            subfolders: undefined
        };
    },
    computed: {
        caption: function () {
            return this.folder == "/" ? "Gallery" : U.pathLastElement(this.folder);
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
        },
        conditionalSelected: function(folder) {
            if(this.selectedFolder && this.selectedFolder.startsWith(folder))
                return this.selectedFolder
            else
                return null
        }
    },
    created: function () {
        this.fetchConditionally();
    },
    template: `
    <div>
      <div class="tree-item-head" v-bind:class="{selected: conditionalSelected(this.folder)}">
        <span @click="toggle" v-if="expanded" class="icon expand-icon glyphicon glyphicon-minus"></span> 
        <span @click="toggle" v-if="!expanded" class="icon expand-icon glyphicon glyphicon-plus"></span>
        <span @click="select" class="tree-item-caption">{{caption}}</span>
      </div>
      <ul v-show="expanded">
        <li v-for="sf in subfolders" class="tree-item">
            <gallery-tree :folder="sf" v-on:folderSelected="forwardSelect" :selectedFolder="conditionalSelected(sf)"></gallery-tree>
        </li>
      </ul>
    </div>
    `
})

