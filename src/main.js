import Vue from "vue"
import App from "./App.vue"
import Fragment from 'vue-fragment'
import "./plugins/element.js"
import "@/assets/reset.scss"

Vue.config.productionTip = false
Vue.use(Fragment.Plugin)

new Vue({
  render: h => h(App)
}).$mount("#app")
