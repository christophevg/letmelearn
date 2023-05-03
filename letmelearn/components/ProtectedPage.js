Vue.component("ProtectedPage", {
  template : `
<div>
  <div v-if="session">
    <v-toolbar flat :prominent="show_extended" :extended="show_extended">
      <v-avatar>
        <img :src="session.picture" :alt="session.name" referrerpolicy="no-referrer">
      </v-avatar>
      <v-toolbar-title>Hi {{ session.name }}! 👋</v-toolbar-title>
      <v-spacer></v-spacer>
      <slot name="subheader" v-if="!show_extended"></slot>
      <v-spacer></v-spacer>
  
      <v-tooltip left>
        <template v-slot:activator="{ on }">
          <v-btn @click="logout()" flat icon v-on="on"><v-icon>close</v-icon></v-btn>
        </template>
        <span>log out</span>
      </v-tooltip>

      <template v-slot:extension v-if="show_extended">
        <slot name="subheader"></slot>
      </template>
    </v-toolbar>
    <slot></slot>
  </div>
    
  <div v-else>
    <h1>✋ To access Let me Learn, please <v-btn @click="login()">log in using Google...</v-btn></h1>
    <slot name="public"></slot>
  </div>  
</div>
`,
  computed: {
    show_extended: function() {
      return this.$vuetify.breakpoint.name == "xs";
    },
    session : function() {
      return store.state.auth.session;
    }
  },
  methods: {
    login : function() { store.dispatch("login");  },
    logout: function() {
      if(confirm("Logging out... Are you sure?")) {
        store.dispatch("logout");
      }
    }
  }
});
