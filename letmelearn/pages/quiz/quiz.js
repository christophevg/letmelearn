var Quiz = {
  template: `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector @change="change_topic" multiple tags/>
    <v-btn flat icon @click="start" :disabled="!selected || playing">
      <v-icon>play_arrow</v-icon>
    </v-btn>
    <v-btn flat icon @click="stop" :disabled="!playing">
      <v-icon>stop</v-icon>
    </v-btn>
    <v-btn flat icon @click="reset" :disabled="!playing">
      <v-icon>replay</v-icon>
    </v-btn>
    <v-btn flat icon @click="swap" :disabled="!selected">
      <v-icon>{{ direction_icon }}</v-icon>
    </v-btn>
    <v-btn flat icon @click="toggle_style" :disabled="!selected">
      <v-icon>{{ style_icon }}</v-icon>
    </v-btn>
  </template>

  <h1>Quiz...</h1>
  
  <v-progress-linear
      size="items_count"
      v-model="pct_correct"
      :buffer-value="pct_asked"
      buffer
      v-if="playing"></v-progress-linear>

  <!-- text -->

  <v-layout v-if="question && !multiplechoice && !result">
    <v-flex xs12 sm6 offset-sm3>
      <v-form @submit.prevent="answer(written)">
        <v-card>
          <v-card-title primary-title class="justify-center">
            <h3 class="headline mb-0">{{ any_alternative_from(question.key) }}</h3><br>
            <div style="width:100%; text-align:center;margin-top:20px;">
              <v-text-field ref="written" v-model="written"></v-text-field>
            </div>
          </v-card-title>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn type="submit">ok</v-btn>
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-flex>
  </v-layout>

  <v-layout v-if="!multiplechoice && result">
    <v-flex xs12 sm6 offset-sm3>
      <v-form @submit.prevent="next_question">
        <v-card>
          <v-card-title primary-title class="justify-center">
            <h3 class="headline mb-0">{{ question.key.replace("|", " or ") }}</h3><br>
            <div style="width:100%; text-align:center;margin-top:20px;">
              <v-text-field ref="written_result" v-model="written" :error="!result.correct" :background-color="result.outcome"></v-text-field>
              <h1 v-if="!result.correct" style="color:green">{{ question.value.replace("|", " or ") }}</h1>
            </div>
          </v-card-title>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn type="submit">next...</v-btn>
            <v-btn @click="accept_error" v-if="!result.correct">correct</v-btn>
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-flex>
  </v-layout>

  <!-- multiple choice -->

  <v-layout v-if="question && multiplechoice && !result">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ any_alternative_from(question.key) }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn @click="answer(choice)" v-for="choice in question.choices" v-bind:key="choice" block>
              {{ any_alternative_from(choice) }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-actions>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>

  <v-layout v-if="result && multiplechoice">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ result.key.replace("|", " or ") }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn v-for="(choice, index) in result.choices" v-bind:key="index" block :color="result.outcome[index]">
              {{ choice.replace("|", " or ") }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="next_question">next...</v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>

  <v-layout v-if="done">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-img src="/app/static/images/happy.png" aspect-ratio="2.75"></v-img>

        <v-card-title primary-title>
          <div>
            <h3 class="headline mb-0">🎉 All done!</h3>
          </div>
        </v-card-title>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-spacer></v-spacer>
          <br><br>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>

</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "question_answer",
    text:    "Quiz",
    path:    "/quiz",
    index:   3
  },
  mounted: function() {
    // if(this.selected && this.selected._id != window.location.hash.substring(1)){
    //   window.location.hash = this.selected._id;
    // }
  },
  computed: {
    selected: function() {
      return store.state.topics.selected;
    },
    playing: function() {
      return store.state.topics.quiz.length > 0;
    },
    direction_icon: function() {
      return this.value2key ? "arrow_back" : "arrow_forward";
    },
    style_icon: function() {
      return this.multiplechoice ? "list" : "edit";
    },
    items_count: function() {
      return this.selected ? store.getters.selected_items.length : 0;
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
    answers: function() {
      return this.question.value.split("|").map(function(value) {
        return value.trim();
      });
    },
    asked: function() {
      return Object.keys(this.asked_keys).length;
    }
  },
  methods: {
    start : function() {
      this.done = false;
      this.result = false;
      this.correct = 0;
      this.asked_keys = []
      store.dispatch("create_quiz", this.value2key);
      if( !this.multiplechoice ) {
        setTimeout(() => {
          this.$refs.written.focus();
        }, 200);
      }
    },
    stop : function() {
      store.dispatch("clear_quiz");
      this.result = false;
      this.written = "";
    },
    reset : function() {
      this.stop();
      this.start();
    },
    change_topic: function(new_topic) {
      if(this.question) { this.reset(); }
    },
    swap : function() {
      this.value2key = !this.value2key;
      this.reset();
    },
    toggle_style: function() {
      this.multiplechoice = !this.multiplechoice;
      this.reset();
    },
    answer: function(guess) {
      var self = this,
          result = this.multiplechoice ?
            this.question.value == guess
          : this.answers.indexOf(guess) !== -1;
      this.result = {
        key: this.question.key,
        correct: result,
        choices: this.question.choices,
        outcome: this.multiplechoice ? this.question.choices.map(function(choice){
          if( choice == self.question.value ) { return "success"};
          if( choice == guess && guess != self.question.value ) { return "error"};
          return null;
        }) : ( result ? "success" : "error ")
      }
      if(this.asked_keys.indexOf(this.question.key) === -1) {
        this.asked_keys.push(this.question.key);
      }
      if(this.result.correct) {
        this.correct += 1;
      }
      if( !this.multiplechoice ) {
        setTimeout(() => {
          this.$refs.written_result.focus();
        }, 200);
      }
    },
    accept_error: function() {
      this.answer(this.question.value);
    },
    next_question: function() {
      if(this.result.correct) {
        store.commit("mark_correct");
      } else {
        store.commit("mark_incorrect");        
      }
      this.result = false;
      this.written = "";
      if( ! this.question ) {
        this.done = true;
      }
      if( !this.multiplechoice && !this.done ) {
        setTimeout(() => {
          this.$refs.written.focus();
        }, 200);
      }
    },
    any_alternative_from: function(answers_string) {
      var answers = answers_string.split("|");
      return answers[answers.length * Math.random() | 0];
    },
  },
  data: function() {
    return {
      value2key: false,
      multiplechoice: true,
      written: "",
      correct: 0,
      result: false,
      done: false,
      asked_keys: [],
    }
  }
};

Navigation.add(Quiz);
