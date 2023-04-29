var Quiz = {
  template : `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector/>
  </template>

  <h1>Quiz...</h1>
  
</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "question_answer",
    text:    "Quiz",
    path:    "/quiz",
    index:   3
  }
};

Navigation.add(Quiz);
