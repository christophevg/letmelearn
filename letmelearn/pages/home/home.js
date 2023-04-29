var Home = {
  template : `
<div>
  <div v-if="session">
    {{ session }} <v-btn @click="logout()">log out</v-btn>
  </div>
    
  <div v-else>
    <v-btn @click="login()">log in using Google...</v-btn>
  </div>  
</div>
`,
  navigation: {
    section: "learn",
    icon:    "dashboard",
    text:    "Ad valvas",
    path:    "/",
    index:   1
  },
  computed: {
    session : function() {
      return store.state.auth.session;
    }
  },
  methods: {
    login : function() { store.dispatch("login");  },
    logout: function() { store.dispatch("logout"); }
  }
};

Navigation.add(Home);
