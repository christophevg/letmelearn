var Sets = {
  template : `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector/>
    <v-btn flat icon @click="create()">
      <v-icon>add</v-icon>
    </v-btn>
  
  </template>
  
  <h1>Sets...</h1>
  {{ selected }}
</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "edit",
    text:    "Sets",
    path:    "/sets",
    index:   2
  },
  computed: {
    selected: function() {
      return store.state.sets.selected;
    }
  },
  methods: {
    create: function() {
      console.log("TODO");
    }
  }
};

Navigation.add(Sets);
