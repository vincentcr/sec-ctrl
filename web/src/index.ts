import Vue from "vue";
import Signin from "./components/signin.vue";
import Dashboard from "./components/dashboard.vue";
import store from "./store";

let v = new Vue({
  el: "#app",
  template: `
    <div id="app" class="ui container">
      <signin v-if='!user'></signin>
      <dashboard v-if='user' v-bind:user='user' v-bind:currentSite='currentSite'></dashboard>
    </div>
  `,
  data: store.state,
  components: {
    Signin,
    Dashboard
  }
});
