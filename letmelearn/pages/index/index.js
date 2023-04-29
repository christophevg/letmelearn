var Index = {
  template : `
<div>
  <div v-if="session">
    {{ session }}
  </div>

  <v-btn @click="login()">log in using Google...</v-btn>
  <v-btn @click="create_session()">create_session</v-btn>
  <v-btn @click="get_session()">get_session</v-btn>
  <v-btn @click="drop_session()">drop_session</v-btn>
  <v-btn @click="logout()">forget token</v-btn>
  
</div>
`,
  navigation: {
    section: "Index",
    icon:    "home",
    text:    "Index",
    path:    "/",
    index:   1
  },
  mounted: function() {
    // setup oatk
    window.oatk.using_provider(store.state.config.oauth.provider);
    window.oatk.using_client_id(store.state.config.oauth.client_id);
    window.oatk.apply_flow("implicit");
    // re-establish session or create it from a token
    var self = this;
    this.get_session(function(){
      console.log("could not get a session");
      // no session handler
      // if we have a token ... try to re-establish session using the token
      if(self.have_authenticated_user) {
        console.log("using token to create session...");
        self.create_session();
      }
    });
  },
  computed: {
    have_authenticated_user: function() {
      this.refresh;
      return oatk.have_authenticated_user();
    },
    user: function() {
      this.refresh;
      return oatk.get_user_info();
    }
  },
  methods: {
    login: function() {
      oatk.login();
    },
    logout: function() {
      var self = this;
      oatk.logout(function(){
        self.refresh++; // force recompute
      });
    },
    create_session: function() {
      var self = this;
      oatk.http.postJSON("/api/session", {}, function(result) {
        self.session = result;
      });
    },
    get_session: function(on_error) {
      var self = this;
      $.ajax({
        type: "GET",
        url: "/api/session",
        success: function(result) {
          self.session = result;
        },
        error: on_error,
        dataType: "json"
      });
    },
    drop_session: function() {
      this.session = null;
      $.ajax({
        type: "DELETE",
        url: "/api/session",
        success: function(result) {
          console.log("session dropped");
        }
      });
    }
  },
  data() {
    return {
      refresh: 0,
      session: null
    }
  }
};

Navigation.add(Index)
