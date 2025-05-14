Vue.component("Page", {
  template: `
<div>
<slot/>
<v-snackbar v-model="show" color="error" :timeout="timeout" top>
  {{ text }}
  <v-btn dark flat @click="show = ''">
    Close
  </v-btn>
</v-snackbar>
</div>
`,
  computed: {
    show: {
      set: function(value) {
        store.commit("show_error", value);
      },
      get: function() {
        return store.getters.showing_error;
      }
    },
    text: function() {
      return store.state.status.error_msg;
    }
  },
  data: function() {
    return {
      timeout: 6000
    }
  }
});

store.registerModule("status", {
  state: {
    showing_error: false,
    error_msg : ""
  },
  getters: {
    showing_error: function(state) {
      return state.showing_error;
    }
  },
  actions: {
    raise_error: function(context, msg) {
      context.commit("error", msg);
      if(msg !== "") { context.commit("show_error", true); }
    }
  },
  mutations: {
    show_error: function(state, showing) {
      state.showing_error = showing;
    },
    error: function(state, msg) {
      state.error_msg = msg;
    }
  }
});

Vue.component("ProtectedPage", {
  template: `
<Page>
  <div v-if="session" style="margin-top:64px">

    <v-toolbar flat fixed height="64px" style="padding-top:64px">
      <v-toolbar-title>

        <v-menu bottom right v-model="show_identities">
          <v-list>
            <v-list-tile avatar v-for="(identity, i) in identities" :key="i" @click="select_identity(identity)">
              <v-list-tile-avatar>
                <img :src="identity.picture" :alt="identity.name" referrerpolicy="no-referrer">
              </v-list-tile-avatar>
              <v-list-tile-content>
                <v-list-tile-title>{{ identity.name }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </v-list>
        </v-menu>

        <v-avatar @click="show_identities=true">
          <img :src="session.picture" :alt="session.name" referrerpolicy="no-referrer">
        </v-avatar>
        Hi {{ session.name }}! 👋
      </v-toolbar-title>

      <v-spacer/>

      <slot name="subheader" v-if="!show_extended"/>

      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn float icon @click="logout()" v-on="on"><v-icon>close</v-icon></v-btn>
        </template>
        <span>log out</span>
      </v-tooltip>

    </v-toolbar>

    <v-toolbar flat fixed height="48px" style="margin-top:120px" v-if="show_extended">

      <v-spacer/>
  
      <slot name="subheader"/>

      <v-spacer/>
  
    </v-toolbar>

    <div :style="content_style">
      <slot/>
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
                <router-link to="/about">about page</router-link> contains a little more
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
</Page>
`,
  computed: {
    show_extended: function() {
      return this.$vuetify.breakpoint.name == "xs" || this.$vuetify.breakpoint.name == "sm";
    },
    session : function() {
      return store.state.auth.session;
    },
    identities: function() {
      const identities = [...this.session["identities"]];
      if(identities) {
        identities.push(this.session);
      }
      return identities;
    },
    content_style: function() {
      return "padding-top: " + this.content_top_margin + "px";
    },
    content_top_margin: function() {
      return this.show_extended ? 40 : 0;
    }
  },
  methods: {
    login : function() { store.dispatch("login");  },
    logout: function() {
      if(confirm("Logging out... Are you sure?")) {
        store.dispatch("logout");
      }
    },
    select_identity: function(identity) {
      store.dispatch("select_identity", identity);
    }
  },
  data: function() {
    return {
      show_identities: false
    }
  }
});
