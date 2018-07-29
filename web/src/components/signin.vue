<template>
    <div class='signin-form ui form'>
      <h4> Sign In </h4>
      <div class='field'>
        <label for="username">username:</label>
        <input name='username' v-model="username" required=true />
      </div>
      <div class='field'>
        <label for="username">password:</label>
        <input name='password' type='password' required=true  v-model="password" />
      </div>
      <div class='field'>
        <button class='ui button' name=login v-on:click="login">login</button>
      </div>
      <div class="ui error message">
        <label>{{error}}</label>
      </div>
    </div>
</template>

<style>
.signin-form {
  max-width: 500px;
}
</style>

<script lang="ts">
import Vue from "vue";
import api from "../api";
import store from "../store";

type SignInFormState = {
  username?: string;
  password?: string;
  error?: string;
};

export default Vue.extend({
  data: () => {
    return {
      username: undefined,
      password: undefined,
      error: undefined
    } as SignInFormState;
  },
  methods: {
    async login() {
      try {
        await login({ username: this.username!, password: this.password! });
      } catch (err) {
        this.error = err.message;
      }
    }
  }
});

async function login(data: { username: string; password: string }) {
  const res = await api("/users/signin", {
    method: "POST",
    data
  });
  store.setUser(res);
}
</script>
