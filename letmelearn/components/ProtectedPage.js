Vue.component("ProtectedPage", {
  template : `
<div>
  <div v-if="session">
    <v-toolbar flat>
      <v-avatar>
        <img :src="session.picture" :alt="session.name" referrerpolicy="no-referrer">
      </v-avatar>
      <v-toolbar-title>Hi {{ session.name }}! 👋</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn @click="logout()" flat icon><v-icon>close</v-icon></v-btn>
    </v-toolbar>

    <slot></slot>
  </div>
    
  <div v-else>
    <h1>✋ To access Let me Learn, please <v-btn @click="login()">log in using Google...</v-btn></h1>
  </div>  
</div>
`,
  computed: {
    session : function() {
      return store.state.auth.session;
    }
  },
  methods: {
    login : function() { store.dispatch("login");  },
    logout: function() { store.dispatch("logout"); }
  }
});
