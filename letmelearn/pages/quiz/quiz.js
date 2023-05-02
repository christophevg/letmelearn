var Quiz = {
  template : `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector/>
    <v-btn flat icon @click="start" :disabled="!selected || playing">
      <v-icon>play_arrow</v-icon>
    </v-btn>
    <v-btn flat icon @click="stop" :disabled="!playing">
      <v-icon>stop</v-icon>
    </v-btn>
    <v-btn flat icon @click="reset" :disabled="!playing">
      <v-icon>replay</v-icon>
    </v-btn>
<!--
    <v-btn flat icon @click="swap" :disabled="!selected">
      <v-icon>{{ direction_icon }}</v-icon>
    </v-btn>
-->
  </template>

  <h1>Quiz...</h1>
  
  <v-layout v-if="question && !result">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ question.key }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn @click="answer(choice)" v-for="choice in question.choices" v-bind:key="choice" block>
              {{ choice }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-actions>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>

  <v-layout v-if="result">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ result.key }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn v-for="(choice, index) in result.choices" v-bind:key="index" block :color="result.outcome[index]">
              {{ choice }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="next_question">
            next...
          </v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>
    
  <v-footer class="pa-3" absolute v-if="playing">
    <v-progress-linear
        size="items_count"
        v-model="pct_correct"
        :buffer-value="pct_asked"
        buffer
      ></v-progress-linear>
  </v-footer>
  
</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "question_answer",
    text:    "Quiz",
    path:    "/quiz",
    index:   3
  },
  computed: {
    selected: function() {
      return store.state.topics.selected;
    },
    playing: function() {
      return store.state.topics.quiz.length > 0;
    },
    direction_icon: function() {
      return this.left2right ? "arrow_forward" : "arrow_back";
    },
    items_count: function() {
      return this.selected ? this.selected.items.length : 0;
    },
    pct_asked: function() {
      return (this.asked / this.items_count) * 100;
    },
    pct_correct: function() {
      return (this.correct / this.items_count) * 100;
    },
    question: function() {
      return store.state.topics.quiz[0];
    },
    asked: function() {
      return Object.keys(this.asked_keys).length;
    }
  },
  methods: {
    start : function() {
      this.result = false;
      this.correct = 0;
      this.asked_keys = []
      store.dispatch("create_quiz", this.selected);      
    },
    stop : function() {
      store.dispatch("clear_quiz");
    },
    reset : function() {
      this.stop();
      this.start();
    },
    swap : function() {
      // this.left2right = !this.left2right;
    },
    answer: function(guess) {
      var self = this;
      this.result = {
        key: this.question.key,
        correct: this.question.value == guess,
        choices: this.question.choices,
        outcome: this.question.choices.map(function(choice){
          if( choice == self.question.value ) { return "success"};
          if( choice == guess && guess != self.question.value ) { return "error"};
          return null;
        })
      }
      if(this.asked_keys.indexOf(this.question.key) === -1) {
        this.asked_keys.push(this.question.key);
      }
      if(this.result.correct) {
        this.correct += 1;
      }
    },
    next_question: function() {
      if(this.result.correct) {
        store.commit("mark_correct");
      } else {
        store.commit("mark_incorrect");        
      }
      this.result = false;
    }
  },
  data: function() {
    return {
      left2right: true,
      correct: 0,
      result: false,
      asked_keys: []
    }
  }
};

Navigation.add(Quiz);
