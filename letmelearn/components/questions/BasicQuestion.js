Vue.component("BasicQuestion", {
  props: [ "question", "expected", "choices", "context" ],
  template: `
<div style="padding-top:15px">
  
  <!-- text -->

  <v-layout v-if="!this.context.multiplechoice && !result">
    <v-flex xs12 sm6 offset-sm3>
      <v-form @submit.prevent="answer(written)">
        <v-card>
          <v-card-title primary-title class="justify-center">
            <h3 class="headline mb-0">{{ any_alternative_from(this.question) }}</h3><br>
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
            <h3 class="headline mb-0">{{ this.question.replace("|", " of ") }}</h3><br>
            <div style="width:100%; text-align:center;margin-top:20px;">
              <v-text-field ref="written_result" v-model="written" :error="!result.correct" :background-color="result.markup"></v-text-field>
              <h1 v-if="!result.correct" style="color:green">{{ this.expected.replace("|", " or ") }}</h1>
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
          <h3 class="headline mb-0">{{ any_alternative_from(this.question) }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn @click="answer(choice)" v-for="choice in this.choices" v-bind:key="choice" block>
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
          <h3 class="headline mb-0">{{ this.question.replace("|", " of ") }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-btn v-for="(choice, index) in result.choices"
                   v-bind:key="index"
                   block
                   :color="result.markup[index]">
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
    answers: function() {
      return this.expected.split("|").map(function(possible_value) {
        return possible_value.trim();
      });
    }
  },
  methods: {
    answer: function(guess) {
      var self = this,
          outcome = this.context.multiplechoice ?
            this.expected == guess
          : this.answers.indexOf(guess) !== -1;
      this.result = {
        correct: outcome,
        choices: this.choices,
        markup: this.context.multiplechoice ? 
          this.choices.map(function(choice){
            if( choice == self.expected )                   { return "success" };
            if( choice == guess && guess != self.expected ) { return "error"   };
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
      this.answer(this.any_alternative_from(this.expected));
    },
    any_alternative_from: function(answers_string) {
      var answers = answers_string.split("|");
      return answers[answers.length * Math.random() | 0];
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

