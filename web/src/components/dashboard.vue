<template>
    <div class='ui segment'>
      <h4>Welcome {{user.username}}</h4>

      <site-component v-if="currentSite" v-bind:site="currentSite"></site-component>
      <ul  v-if="!currentSite">
        <li v-for='site in user.sites' v-bind:key="site.thingId">{{site}}</li>
      </ul>

    </div>
</template>

<script lang="ts">
import Vue from "vue";
import SiteComponent from "./site.vue";
import { User, Site } from "../store";

export default Vue.component("dashboard", {
  props: ["user", "currentSite"],
  components: {
    SiteComponent
  }
});
</script>
