var Sets = {
  template : `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector/>
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
  }
};

Navigation.add(Sets);
