import Vue from "vue";
import T from "./gallery-toaster"

export default Vue.component("user-details-dialog", {
    props: [],
    data: function() {
        return {
            cognitoUser: null,
            nickname: "",
            password: "",
            password2: ""
        }
    },
    methods: {
        captureUserDetails: function(cognitoUser) {
            this.cognitoUser = cognitoUser;
            const that = this
            Vue.nextTick(function() {
                jQuery(that.$refs.modal).modal("show")
                console.log("Capturing details for ", that.cognitoUser)
            })
        },
        submit: function(args) {
            console.log("TODO submit details", args, this.$data, this.cognitoUser)
            const that = this;
            const m = function(field) {
               if(!that.$data[field] || that.$data[field] == "") {
                   T.error(field + " is required")
                   return true
               } else {
                   return false;
               }
            }

            if(m("nickname") || m("password") || m("password2")) {
                //noop
            } else if(this.$data.password != this.$data.password2) {
                T.error("Passwords do not match")
            } else {
                UserService.finishRegistration(this.cognitoUser, this.nickname, this.password).then(() => {
                    jQuery(that.$refs.modal).modal("hide")
                    that.cognitoUser = null
                }, (err) => {
                    console.error("Failed to change the password", that.cognitoUser, err)
                    T.error(err)
                })
            }
        }
    },
    template: `
<div>
    <div v-if="cognitoUser" class="modal fade" tabindex="-1" role="dialog" ref="modal" data-backdrop="static" data-keyboard="false">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title">Complete user registration</h4>
          </div>
          <div class="modal-body">
            <form>
               <div class="form-group">
                 <input type="text" class="form-control" placeholder="Nickname" v-model:value="nickname">
                 <input type="password" class="form-control" placeholder="Password" v-model:value="password">
                 <input type="password" class="form-control" placeholder="Repeat password" v-model:value="password2">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" @click="submit">OK</button>
          </div>
        </div>
      </div>
    </div>
    </div>`
})

