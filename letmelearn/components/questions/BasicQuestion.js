Vue.component("BasicQuestion", {
  props: [
    "topic", "question", "expected",  // actual question properties
    "context",                        // reference to the quiz
    "editor", "summary"               // view styles, default is "asking"
  ],
  template: `
<div style="padding-top:15px">
  
  <!-- text -->

  <v-layout v-if="!this.context.multiplechoice && !result">
    <v-flex xs12 sm6 offset-sm3>
      <v-form @submit.prevent="answer(written)">
        <v-card>
          <v-card-title primary-title class="justify-center">
            <h3 class="headline mb-0">{{ any_alternative_from(this.current_question) }}</h3><br>
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

  <v-layout v-if="!this.context.multiplechoice && result">
    <v-flex xs12 sm6 offset-sm3>
      <v-form @submit.prevent="next_question">
        <v-card>
          <v-card-title primary-title class="justify-center">
            <h3 class="headline mb-0">{{ this.current_question.replace("|", " of ") }}</h3><br>
            <div style="width:100%; text-align:center;margin-top:20px;">
              <v-text-field ref="written_result" v-model="written" :error="!result.correct" :background-color="result.markup"></v-text-field>
              <h1 v-if="!result.correct" style="color:green">{{ this.current_expected.replace("|", " or ") }}</h1>
              <h1 v-if="!result.correct">
                <template v-for="possible_answer in diff">
                  <div>
                  <template v-for="chunk in possible_answer">
                      <span style="text-decoration:none;color:#b30000;background:#fadad7;" v-if="chunk.added">{{ chunk.value.replace(" ", "&nbsp;") }}</span>
                      <span style="text-decoration:none;background:#eaf2c2;color:#406619;" v-if="chunk.removed">{{ chunk.value.replace(" ", "&nbsp;") }}</span>
                      <span style="text-decoration:none;"                                  v-if="!chunk.removed && !chunk.added">{{ chunk.value }}</span>
                  </template>
                  </div>
                </template>
              </h1>
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

  <v-layout v-if="this.context.multiplechoice && !result">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ any_alternative_from(this.current_question) }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn @click="answer(choice)"
                   v-for="choice in this.choices"
                   v-bind:key="choice" block
                   class="text-none">
              {{ any_alternative_from(choice) }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-actions>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>

  <v-layout v-if="this.context.multiplechoice && result">
    <v-flex xs12 sm6 offset-sm3>
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ this.current_question.replace("|", " of ") }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn v-for="(choice, index) in result.choices"
                   v-bind:key="index"
                   block
                   :color="result.markup[index]"
                   class="text-none">
              {{ choice.replace("|", " of ") }}
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
</div>
`,
  mounted: function() {
    if( !this.context.multiplechoice ) {
      setTimeout(() => {
        this.$refs.written.focus();
      }, 200);
    }
  },
  computed: {
    asking: function() {
      return ! this.editor && ! this.summary;
    },
    current_question: function() {
      return this.context.right2left ? this.expected : this.question;
    },
    current_expected: function() {
      return this.context.right2left ? this.question : this.expected;
    },
    answers: function() {
      return this.current_expected.split("|").map(function(possible_value) {
        return possible_value.trim();
      });
    },
    choices: function() {
      // select 2 additional random items from our topic
      var self = this;
      return store.getters.topic(this.topic).items
        .filter(function(item){ return item.value != self.expected; })
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(function(item) {
          if(self.context.right2left) {
            return item.key;
          } else {
            return item.value;
          }
        })
        .concat([this.current_expected])
        .sort(()=>Math.random()-0.5);
    },
    diff: function() {
      var self = this;
      diffs = this.answers.map(function(possible_answer) {
        return JsDiff.diffChars(possible_answer, self.written);
      });
      console.log(diffs);
      return diffs;
    }
  },
  methods: {
    answer: function(guess) {
      guess = guess.trim(); // be gentle and remove leading/trailing space ;-)
      var self = this,
          outcome = this.context.multiplechoice ?
            this.current_expected == guess
          : this.answers.indexOf(guess) !== -1;
      this.result = {
        correct: outcome,
        choices: this.choices,
        markup: this.context.multiplechoice ? 
          this.choices.map(function(choice){
            if( choice == self.current_expected )                   { return "success" };
            if( choice == guess && guess != self.current_expected ) { return "error"   };
            return null;
          })
          : ( outcome ? "success" : "error ")
      }
      if( ! this.context.multiplechoice ) {
        setTimeout(() => {
          this.$refs.written_result.focus();
        }, 200);
      }
    },
    accept_error: function() {
      // fake correct answer by providing a correct one
      this.answer(this.any_alternative_from(this.current_expected));
    },
    any_alternative_from: function(answers_string) {
      var answers = answers_string.split("|");
      return answers[answers.length * Math.random() | 0].trim();
    },
    next_question: function() {
      this.$emit("next", this.result);
      this.result = null;
      this.written = "";
    }
  },
  data: function() {
    return {
      written: "",
      result: null
    }
  }
});


