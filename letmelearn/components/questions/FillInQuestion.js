var FillInBase = Vue.component("FillInBase", {
  props : [
    "context",
    "item"
  ],
  computed: {
    question: function() {
      return this.item.question;
    },
    expected: function() {
      return this.item.answer;
    }
  },
  methods: {
    any: function(items) {
      return items[items.length * Math.random() | 0];
    }
  }
});

Vue.component("FillInQuestionAskingWritten", {
  mixins: [ FillInBase ],
  template: `
<v-layout v-if="outcome === null">
  <v-flex xs12 sm6 offset-sm3>
    <v-form @submit.prevent="answer(written)">
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">
        
            <v-layout row class="pa-0 ma-0">

              <v-flex d-flex align-right v-if="question_start != ''">
                <div style="display:inline-block;white-space: nowrap;margin-right: 10px;">{{ question_start }}</div>
              </v-flex>

              <v-flex d-flex align-center>
                <div style=""
                <v-text-field v-model="written"
                              autofocus
                              v-if="outcome == null"
                              hide-details
                              single-line
                              class="large-size"/>
              </v-flex>

              <v-flex d-flex align-left v-if="question_end != ''">
                <div style="display:inline-block;white-space: nowrap;margin-left: 10px;">{{ question_end }}</div>
              </v-flex>

            </v-layout>
                          
          </h3>
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

<v-layout v-else>
  <v-flex xs12 sm6 offset-sm3>
    <v-form @submit.prevent="next">
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">

            <v-layout row class="pa-0 ma-0">

              <v-flex d-flex align-right v-if="question_start != ''">
                <div style="display:inline-block;white-space: nowrap;margin-right: 10px;">{{ question_start }}</div>
              </v-flex>

              <v-flex d-flex align-center>
                <v-text-field v-model="written"
                              ref="written_result"
                              :error="outcome === false"
                              :background-color="outcome ? 'success' : 'error'"
                              readonly
                              hide-details
                              single-line
                              autofocus
                              class="large-size"/>
              </v-flex>
  
              <v-flex d-flex align-left v-if="question_end != ''">
                <div style="display:inline-block;white-space: nowrap;margin-left: 10px;">{{ question_end }}</div>
              </v-flex>
            
            </v-layout>
  
          </h3>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <h1 v-if="outcome === false" style="color:green">{{ question.expected }}</h1>
            <h1 v-if="outcome === false">
              <template v-for="possible_answer in expected">
                <TextDiff :expected="possible_answer" :actual="written"/>
              </template>
            </h1>
          </div>
        </v-card-title>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn type="submit">next...</v-btn>
          <v-btn @click="accept_error" v-if="outcome === false">correct</v-btn>
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-flex>
</v-layout>
`,
  computed: {
    question_parts: function() {
      return this.question.split("...")
    },
    question_start: function() {
      return this.question_parts[0];
    },
    question_end: function() {
      return this.question_parts[1];
    }
  },
  methods: {
    possible_answers: function() {
      // ensure that all expected/possible answers are trimmed
      return this.expected.map(function(item) { return item.trim() });
    },
    answer: function(guess) {
      this.outcome = this.expected.indexOf(guess.trim()) !== -1;
    },
    next: function() {
      this.$emit("next", this.outcome);
      this.written = "";
      this.outcome = null;
    },
    accept_error: function() {
      // fake correct answer by providing a correct one
      this.answer(this.any(this.expected));
    }
  },
  data: function() {
    return {
      written: "",
      outcome: null
    }
  }
});

Vue.component("FillInQuestionAskingChoice", {
  mixins: [ FillInBase ],
  props : [
    "topic",
  ],
  template: `
<v-layout v-if="outcome === null">
  <v-flex xs12 sm6 offset-sm3>
    <v-card>
      <v-card-title primary-title class="justify-center">
        <h3 class="headline mb-0">{{ question }}</h3><br>
        <div style="width:100%; text-align:center;margin-top:20px;">
          <v-btn @click="answer(choice)"
                 v-for="(choice, index) in choices"
                 v-bind:key="index"
                 block
                 class="text-none">
            {{ choice }}
          </v-btn>
        </div>
      </v-card-title>
      <v-card-actions>
      </v-card-actions>
    </v-card>
  </v-flex>
</v-layout>

<v-layout v-else-if="outcome !== null">
  <v-flex xs12 sm6 offset-sm3>
    <v-card>
      <v-card-title primary-title class="justify-center">
        <h3 class="headline mb-0">{{ question }}</h3><br>
        <div style="width:100%; text-align:center;margin-top:20px;">
          <v-btn v-for="(choice, index) in choices"
                 v-bind:key="index"
                 block
                 :color="markup[index]"
                 class="text-none">
            {{ choice }}
          </v-btn>
        </div>
      </v-card-title>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="next">next...</v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-flex>
</v-layout>
`,
  computed: {
    choices: function() {
      if(this.topic) {
        return this.topic.question.props.options;
      }
      return [];
    }
  },
  methods: {
    answer: function(guess) {
      var self = this;
      this.outcome = this.expected.indexOf(guess.trim()) !== -1;
      this.markup  = this.choices.map(function(choice){
        if( self.expected.indexOf(choice) !== -1 )  { return "success" };
        if( choice == guess && !self.outcome )      { return "error"   };
        return null;
      });
    },
    next: function() {
      this.$emit("next", this.outcome);
      this.outcome = null;
      this.markup  = null;
    }
  },
  data: function() {
    return {
      outcome: null,
      markup: null
    }
  }
});

// asking dispatches to the asking style: multiple choice or written

Vue.component("FillInQuestionAsking", {
  props: {
    topic    : Object,
    item     : Object,      
    context  : Object
  },
  template: `
<div style="padding-top:15px">
  <FillInQuestionAskingChoice  v-if="this.context.multiplechoice"
                              :topic="this.topic"
                              :context="this.context"
                              :item="this.item"
                              @next="next"/>
  <FillInQuestionAskingWritten v-if="!this.context.multiplechoice"
                              :topic="this.topic"
                              :context="this.context"
                              :item="this.item"
                              @next="next"/>
</div>
`,
  methods: {
    next: function(outcome) {
      this.$emit("next", outcome);
    }
  }
});

// item editor form

Vue.component("FillInQuestionEditor", {
  props: [
    "topic",
    "item",
    "showing"
  ],
  template: `
<div v-if="model">
  
  <v-text-field v-model="model.question"
                :label="label('question')"
                hint="Gebruik drie puntjes (...) om aan te geven waar het antwoord moet ingevuld worden."
                :persistent-hint="true"
                :autofocus="true"
                v-if="showing"/>
  <br>
  <v-select v-model="model.answer"
						:items="possible_answers"
            chips
            multiple
            dense
            :label="label('answer')">
    <template v-slot:selection="{ item, index }">
      <v-chip close @input="remove(index);">
        <span>{{ item.value }}</span>
      </v-chip>
    </template>
  </v-select>
</div>
`,
  computed: {
    model: function() {
      if(this.item.original === null) { return null; }
      if(this.item.updated === null) {
        this.item.updated = {
          question : this.item.original.question,
          answer   : [...this.item.original.answer]
        }
      }
      return this.item.updated;
    },
    label: function() {
      var self = this;
      return function(prop) {
        if(self.topic) {
          return self.topic.question.labels[prop];
        }
        return "";
      }
    },
    possible_answers: function() {
      if(this.topic) {
        return this.topic.question.props.options.map(function(option) {
          return { text: option, value: option };
        });
      }
      return []
    }
  },
  methods: {
    remove: function(index) {
      this.model.answer.splice(index, 1);
    }
  }
});

// importer is show on the topics page importer tab

Vue.component("FillInQuestionImporter", {
  props: [
    "topic"
  ],
  template: `
<div>
  <h3>Importeer {{ this.topic.name }}</h3>
  <p>
    Plak hieronder rijen met waarden voor {{ label("question") }} en {{ label("answer") }}.
    Scheid ze van elkaar met een <code>tab</code>.
    Meerdere goede waarden voor {{ label("answer") }} kan je scheiden van elkaar door een <code>pipe</code> symbool (<code>|</code>).<br>
    Druk vervolgens op <code>import...</code>.
  </p>
  
  <v-alert :value="true" color="warning" icon="warning" outline>
    Let op! Deze import vervangt de eventueel reeds bestaande gegevens.
  </v-alert>

  <v-textarea v-model="data" label="Te importeren..." auto-grow></v-textarea>

  <v-btn @click="import_topic()">
    <v-icon>save_alt</v-icon> import...
  </v-btn>
</div>
`,
  computed: {
    label: function(prop) {
      var self = this;
      return function(prop) {
        if(self.topic) {
          return self.topic.question.labels[prop];
        }
        return "";
      }
    }
  },
  methods: {
    import_topic: function() {
      var items = this.data.split("\n").map(function(item){
        var parts = item.split("\t");
        return {
          question : parts[0].trim(),
          answer   : parts[1].split("|").map(function(opt) { return opt.trim(); })
        }
      });
      store.dispatch("update_topic", {
        topic: this.topic,
        update: {
          items: items
        }
      });
      this.data = "";
      this.$emit("import_success");
    }
  },
  data: function() {
    return {
      data : ""
    }
  }
});

// summary is shown in the topics page data table

Vue.component("FillInQuestionSummary", {
  props: [
    "item",
    "header"
  ],
  template: `
<span>{{ summary }}</span>
`,
  computed: {
    summary: function() {
      if(this.header == "question") {
        return this.item.question;
      }
      if(this.header == "answer") {
        return this.item.answer.join(" of ");
      }
    }
  }
});

// top-level view-style dispatcher -> asking, summary, importer or editor

Vue.component("FillInQuestion", {
  props: {
    topic    : Object,
    item     : Object,
    header   : String,

    context  : Object,
    editor   : Boolean,
    summary  : Boolean,
    importer : Boolean,
    
    training : Boolean,
    
    question : Boolean,
    answer:    Boolean,
    
    showing  : Boolean
  },
  template: `
<FillInQuestionSummary v-if="summary"
                       :header="this.header"
                       :item="item"/>
<FillInQuestionSummary v-else-if="training && (question || answer)"
                       :header="question ? 'question' : 'answer'"
                       :item="item"/>
<FillInQuestionImporter v-else-if="importer"
                       :topic="this.topic"
                       @import_success="import_success"/>
<FillInQuestionEditor   v-else-if="editor"
                       :topic="this.topic"
                       :item="this.item"
                       :showing="showing"/>
<FillInQuestionAsking   v-else
                       :context="this.context"
                       :topic="this.topic"
                       :item="this.item"
                       @next="next"/>
`,
  methods: {
    next: function(outcome) {
      this.$emit("next", outcome);
    },
    import_success: function() {
      this.$emit("import_success");
    }
  }
});

// register question

store.commit("question", {
  name    : "FillInQuestion",
  title   : "Vul het ontbrekende deel in.",
  desc    : "Vervolledig de vraag met het juiste ontbrekende deel.",
  headers : [ "question", "answer" ],
  labels  : { question: "Vraag", answer: "Juist", options: "Mogelijkheden" },
  props   : {
    questions : { question : {}, answer: {}  },
    topic     : { options  : { multi: true } }
  },
  defaults: { question: "", answer: [] }
});
