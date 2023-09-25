Vue.component("ProtectedPage", {
  template: `
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
    <div style="padding:25px;">
      <slot></slot>
    </div>
  </div>
    
  <div v-else>
    
    <v-layout>
      <v-flex xs12 sm6 offset-sm3>
        <v-card>
          <v-img
            src="/app/static/images/students.png"
            aspect-ratio="2.75"
          ></v-img>

          <v-card-title primary-title>
            <div>
              <h3 class="headline mb-0">✋ To access Let me Learn,...</h3>
              <p>

                Hi there. Welcome to <i>Let me Learn</i>. If you have been
                given access before, you can proceed below and log in using
                your Google account.

              </p>
  
              <p>
  
                If you haven't been granted access yet, you'll have to contact
                me 😉 Currently <i>Let me Learn</i> is a closed community. The
                <a href="/about">about page</a> contains a little more
                information about what's behind the curve.
  
              </p>
  
            </div>
          </v-card-title>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="login()">log in using Google...</v-btn>
            <v-spacer></v-spacer>
            <br><br>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>

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
