import Vue from "vue";
import Toaster from 'v-toaster'
import 'v-toaster/dist/v-toaster.css'
Vue.use(Toaster, {timeout: 5000})

const T = {
    error: function(msg) {
        Vue.prototype.$toaster.error(msg)
    }
}

export default T

