var BasicBase = Vue.component("BasicBase", {
  props : [
    "context",
    "item"
  ],
  computed: {
    question: function() {
      return this.context.right2left ? this.item.right : this.item.left;
    },
    any_question: function() { // doesn't recompute like any(question) in tpl
      return this.any(this.question);
    },
    expected: function() {
      return this.context.right2left ? this.item.left : this.item.right;
    }
  },
  methods: {
    any: function(items) {
      return items[items.length * Math.random() | 0];
    },
    format: function(items) {
      return items.join(" or ");
    }
  }
});

Vue.component("BasicQuestionAskingWritten", {
  mixins: [ BasicBase ],
  template: `
<v-layout v-if="outcome === null">
  <v-flex xs12 sm6 offset-sm3>
    <v-form @submit.prevent="answer(written)">
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ any_question }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-text-field autofocus v-if="outcome === null" v-model="written"></v-text-field>
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

<v-layout v-else>
  <v-flex xs12 sm6 offset-sm3>
    <v-form @submit.prevent="next">
      <v-card>
        <v-card-title primary-title class="justify-center">
          <h3 class="headline mb-0">{{ format(question) }}</h3><br>
          <div style="width:100%; text-align:center;margin-top:20px;">
            <v-text-field autofocus v-model="written" :error="outcome === false" :background-color="outcome ? 'success' : 'error'"></v-text-field>
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
  methods: {
    possible_answers: function() {
      // ensure that all expected/possible answers are trimmed
      return this.expected.map(function(item) { return item.trim() });
    },
    answer: function(guess) {
      this.outcome = this.possible_answers().indexOf(guess.trim()) !== -1;
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

Vue.component("BasicQuestionAskingChoice", {
  mixins: [ BasicBase ],
  props : [
    "topic",
  ],
  template: `
<v-layout v-if="outcome === null">
  <v-flex xs12 sm6 offset-sm3>
    <v-card>
      <v-card-title primary-title class="justify-center">
        <h3 class="headline mb-0">{{ any_question }}</h3><br>
        <div style="width:100%; text-align:center;margin-top:20px;">
          <v-btn @click="answer(choice)"
                 v-for="(choice, index) in choices"
                 v-bind:key="index"
                 block
                 class="text-none">
            {{ any(choice) }}
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
        <h3 class="headline mb-0">{{ format(question) }}</h3><br>
        <div style="width:100%; text-align:center;margin-top:20px;">
          <v-btn v-for="(choice, index) in choices"
                 v-bind:key="index"
                 block
                 :color="markup[index]"
                 class="text-none">
            {{ format(choice) }}
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
      // select 2 additional possible answers and shuffle the triplet
      var self = this;
      return store.getters.topic(this.topic._id).items
        .filter(function(item){ return item != self.item; })
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map(function(item) {
          if(self.context.right2left) {
            return item.left;
          } else {
            return item.right;
          }
        })
        .concat([this.expected])
        .sort(()=>Math.random()-0.5);
    }
  },
  methods: {
    answer: function(guess) {
      var self = this;
      this.outcome = guess == this.expected;
      this.markup  = this.choices.map(function(choice){
        if( choice == self.expected )          { return "success" };
        if( choice == guess && !self.outcome ) { return "error"   };
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

Vue.component("BasicQuestionAsking", {
  props: {
    topic    : Object,
    item     : Object,      
    context  : Object
  },
  template: `
<div style="padding-top:15px">
  <BasicQuestionAskingChoice  v-if="this.context.multiplechoice"
                              :topic="this.topic"
                              :context="this.context"
                              :item="this.item"
                              @next="next"/>
  <BasicQuestionAskingWritten v-if="!this.context.multiplechoice"
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

Vue.component("BasicQuestionEditor", {
  props: [
    "topic",
    "item",
    "showing"
  ],
  template: `
<div v-if="model">
  <MultiTextField :model="model.left"
                  :label="label('left')"
                  :focus="true"
                  @remove="(index) => { remove('left', index); }"
                  @add="add('left')"
                  :showing="showing"/>
  <MultiTextField :model="model.right"
                  :label="label('right')"
                  @remove="(index) => { remove('right', index); }"
                  @add="add('right')"
                  :showing="showing"/>
</div>
`,
  computed: {
    model: function() {
      if(this.item.original === null) { return null; }
      if(this.item.updated === null) {
        this.item.updated = {
          left : [...this.item.original.left],
          right: [...this.item.original.right]
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
    }
  },
  methods: {
    add: function(prop) {
      this.item.updated[prop].push("");
    },
    remove: function(prop, index) {
      this.item.updated[prop].splice(index, 1);
    }
  }
});

// importer is show on the topics page importer tab

Vue.component("BasicQuestionImporter", {
  props: [
    "topic"
  ],
  template: `
<div>
  <h3>Importeer {{ this.topic.name }}</h3>
  <p>
    Plak hieronder rijen met waarden voor {{ label("left") }} en {{ label("right") }}.
    Scheid ze van elkaar met een <code>tab</code>.
    Alternatieve waarden kan je scheiden van elkaar door een <code>pipe</code> symbool (<code>|</code>).<br>
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
          left : parts[0].split("|").map(function(opt) { return opt.trim(); }),
          right: parts[1].split("|").map(function(opt) { return opt.trim(); })
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

Vue.component("BasicQuestionSummary", {
  props: [
    "item",
    "header"
  ],
  template: `
<span>{{ summary }}</span>
`,
  computed: {
    summary: function() {
      return this.item[this.header].join(" of ");
    }
  }
});

// top-level view-style dispatcher -> asking, summary, importer or editor

Vue.component("BasicQuestion", {
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
    answer   : Boolean,
    
    showing  : Boolean
  },
  template: `
<BasicQuestionSummary  v-if="summary"
                       :header="this.header"
                       :item="item"/>
<BasicQuestionSummary  v-else-if="training && (question || answer)"
                       :header="question ? 'left' : 'right'"
                       :item="item"/>
<BasicQuestionImporter v-else-if="importer"
                       :topic="this.topic"
                       @import_success="import_success"/>
<BasicQuestionEditor   v-else-if="editor"
                       :topic="this.topic"
                       :item="this.item"
                       :showing="showing"/>
<BasicQuestionAsking   v-else
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
  name    : "BasicQuestion",
  title   : "Eenvoudige vragen/antwoorden.",
  desc    : "Leer begrippen van links naar rechts en omgekeerd. Met meerdere mogelijkheden.",
  headers : [ "left", "right" ],
  labels  : { left: "Links", right: "Rechts" },
  props   : {
    questions : { left : {}, right: {} }
  },
  defaults: { left: [""], right: [""] }
});
