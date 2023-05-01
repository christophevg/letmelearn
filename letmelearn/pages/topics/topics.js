var Topics = {
  template : `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector/>
    <v-btn flat icon @click="create()">
      <v-icon>add</v-icon>
    </v-btn>
  
  </template>
  
  <h1>Topics...</h1>
  {{ selected }}
</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "edit",
    text:    "Topics",
    path:    "/topics",
    index:   2
  },
  computed: {
    selected: function() {
      return store.state.topics.selected;
    }
  },
  methods: {
    create: function() {
      console.log("TODO");
    }
  }
};

Navigation.add(Topics);
