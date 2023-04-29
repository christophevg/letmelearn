var Home = {
  template : `
<ProtectedPage>
  <h1>Ad Valvas...</h1>
  
</ProtectedPage>
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
  }
};

Navigation.add(Home);
