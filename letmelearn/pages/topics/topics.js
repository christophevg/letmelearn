var Topics = {
  template: `
<ProtectedPage>

  <!-- toolbars -->

  <template v-slot:subheader>
    <v-layout row wrap class="pa-0 ma-0">

      <v-flex xs12 sm7 md6 d-flex align-center>
        <TopicSelector/>
      </v-flex>

      <v-flex xs12 sm5 md6 d-flex align-center>

        <v-spacer/>

        <v-btn flat @click="show_create_topic_dialog" class="ma-0">
          <v-icon>add</v-icon>
        </v-btn>

        <v-spacer/>

        <v-btn flat @click="show_edit_topic_dialog" :disabled="!selected" class="ma-0">
          <v-icon>edit</v-icon>
        </v-btn>

        <v-spacer/>

        <v-btn flat @click="show_tag_dialog" :disabled="!selected" class="ma-0">
          <v-icon>bookmark</v-icon>
        </v-btn>

        <v-spacer/>

        <v-btn flat color="red" @click="delete_topic" :disabled="!selected" class="ma-0">
          <v-icon>delete</v-icon>
        </v-btn>

        <v-spacer/>
  
      </v-flex>

    </v-layout>
  </template>

  <!-- tabs: items / import --> 
  
  <v-tabs v-model="tab" v-if="selected">
    <v-tab>
      Items
      <v-btn flat icon @click="show_add_item_dialog" :disabled="tab != 0">
        <v-icon>add</v-icon>
      </v-btn>

    </v-tab>
    <v-tab>Import</v-tab>

    <v-tab-item key="0" fluid>
      <v-card>
        <v-card-text>
          <v-data-table
            :headers="headers"
            :items="selected.items"
            class="elevation-1"
          >
            <template v-slot:items="row">
              <template v-for="header in topic_headers">
              <td>
                <component summary
                           :is="selected.question.type"
                           :item="row.item"
                           :header="header"/>
              </td>
              </template>
              <td width="48px" class="justify-right" style="padding: 0px;">
                <v-icon small class="mr-2" @click="edit_item(row.item)">edit</v-icon>
                <v-icon small @click="delete_item(row.item)" color="red">delete</v-icon>
              </td>
            </template>
  
          </v-data-table>

        </v-card-text>
      </v-card>      
    </v-tab-item>

    <v-tab-item key="1" fluid>
      <v-card>
        <v-card-text>

          <component importer
                     :is="selected.question.type"
                     :topic="selected"
                     @import_success="import_success"/>

        </v-card-text>
      </v-card>      
    </v-tab-item>
  </v-tabs>
  
  <!-- CREATE TOPIC -->
  
  <v-dialog v-model="create_dialog" persistent width="500"  @keydown.esc="new_topic.name = null; create_dialog = false;">
    <v-form @submit.prevent="create_dialog = false; create_topic()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Create a new topic...
        </v-card-title>

        <v-card-text>
          Geef een duidelijke omschrijving voor dit onderwerp:
          <v-text-field label="Naam" required v-model="new_topic.name" ref="new_topic_name"/>
          Kies een vraag-type:
          <v-select :items="question_types" v-model="new_topic.question.type" label="Vraag" @change="question_type_selected"/>
          <div v-if="question_type">
            <i>{{ question_type.desc }}</i><br>
            <br>
            Geef een passende omschrijving voor elke eigenschap:
            <v-text-field v-for="(_, prop, index) in question_type.labels" :key="index" :label="prop" required v-model="new_topic.question[prop]"/>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
            <v-btn color="secondary" flat @click="new_topic.name = null; create_dialog = false">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" flat type="submit">Create...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

    <!-- EDIT TOPIC -->
  
    <v-dialog v-model="edit_dialog" persistent width="500"  @keydown.esc="edited_topic.name = null; edit_dialog = false;">
      <v-form @submit.prevent="edit_dialog = false; update_topic()">
        <v-card>
          <v-card-title class="headline grey lighten-2" primary-title>
            Edit topic...
          </v-card-title>

          <v-card-text v-if="edited_topic.question">
            <v-text-field label="Naam" required v-model="edited_topic.name" ref="edited_topic_name"/>
            <v-text-field v-for="(_, prop, index) in edited_topic.question" :disabled="prop == 'type'" :key="index" :label="prop" required v-model="edited_topic.question[prop]"/>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions>
              <v-btn color="secondary" flat @click="edit_dialog = false">Cancel</v-btn>
              <v-spacer></v-spacer>
              <v-btn color="primary" flat type="submit">Update...</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>

  <!-- EDIT TAGS -->

  <v-dialog v-model="tag_dialog" persistent width="500" @keydown.esc="tag_dialog = false;">
    <v-form @submit.prevent="tag_dialog = false; update_tags()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Tags for this topic...
        </v-card-title>

        <v-card-text>
          Voeg "tags" toe om deze topic te identificeren. De enter/return
          knop maakt van je text een tag.

          <v-combobox v-model="tags" chips deletable-chips multiple></v-combobox>

        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn color="secondary" flat @click="tag_dialog = false">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat type="submit">Update...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

  <!-- ADD ITEM -->
  
  <v-dialog v-model="add_item_dialog" persistent width="500px" @keydown.esc="add_item_dialog = false;">
    <v-form @submit.prevent="add_item_dialog = false; add_item()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Add a new item...
        </v-card-title>

        <v-card-text>
          <component editor :is="selected.question.type"
                            v-if="selected"
                            :topic="selected"
                            :item="this.editing"/>
        </v-card-text>

        <v-card-actions>
          <v-btn color="secondary" flat @click="add_item_dialog = false">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat type="submit">Add...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

  <!-- EDIT ITEM -->

  <v-dialog v-model="edit_item_dialog" persistent width="500px" @keydown.esc="edit_item_dialog = false;">
    <v-form @submit.prevent="edit_item_dialog = false; update_item()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Update item...
        </v-card-title>

        <v-card-text>
          <component editor :is="selected.question.type"
                            v-if="selected"
                            :topic="selected"
                            :item="this.editing"/>
        </v-card-text>

        <v-card-actions>
          <v-btn color="secondary" flat @click="edit_item_dialog = false">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat type="submit">Update...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
  
</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "edit",
    text:    "Topics",
    path:    "/topics",
    index:   2
  },
  mounted: function() {
    if(! this.selected ) { return }
    var expected_hash = store.getters.selected_hash
    if( window.location.hash.substring(1) != expected_hash ){
      window.location.hash = expected_hash;
    }
  },
  computed: {
    selected: function() {
			return store.state.topics.selected.length == 1 ? store.state.topics.selected[0] : null;
    },
    topic_headers: function() {
      return store.getters.question(this.selected.question.type).headers;
    },
    headers: function() {
      var self = this;
      return this.topic_headers.map(function(header){
        return { text: self.selected.question[header], align: "left", sortable: true, value: header };
      }).concat([
        { text: "", sortable: false, value: "item" }
      ])
    },
    question_types: function() {
      return store.getters.questions.map(function(question){
        return question.name;
      })
    },
    question_type: function() {
      if(this.new_topic.question.type) {
        return store.getters.question(this.new_topic.question.type);
      }
      return null;
    }
  },
  methods: {

    show_create_topic_dialog: function() {
      this.new_topic.name = "";
      this.create_dialog  = true;
      setTimeout(() => { this.$refs.new_topic_name.focus(); }, 200);
    },
    question_type_selected: function() {
      this.new_topic.question = {
        type: this.new_topic.question.type
      }
    },
    create_topic: function() {
      if( this.new_topic.name && this.new_topic.question.type ) {
        store.dispatch("create_topic", {
          name: this.new_topic.name,
          question: this.new_topic.question,
          handler: function(created) {
            store.commit("selected_topic", [store.getters.topic(created._id)])
          }
        })
      }
    },
    show_edit_topic_dialog: function() {
      this.edited_topic.name     = this.selected.name;
      this.edited_topic.question = this.selected.question;
      this.edit_dialog = true;
    },
    update_topic: function() {
      if( this.edited_topic.name && this.edited_topic.question.type ) {
        store.dispatch("update_topic", {
          topic   : this.selected,
          update:  {
            name    : this.edited_topic.name,
            question: this.edited_topic.question
          }
        })
      }
    },
    delete_topic: function() {
      if( confirm("Deleting topic " + this.selected.name + " ... Are you sure?")) {
        store.dispatch("remove_topic", this.selected);
      }
    },
    
    show_tag_dialog: function() {
      // copy pre-existing tags
      if(this.selected.tags) {
        this.tags = this.selected.tags;
      } else {
        this.tags = []; // default to empty list
      }
      this.tag_dialog = true;
    },
    update_tags: function() {
      store.dispatch("update_topic", {
        topic : this.selected,
        update: {
          tags: this.tags
        }
      });
    },

    show_add_item_dialog: function() {
      this.editing.original = store.getters.question(this.selected.question.type).defaults;
      this.editing.updated  = null;
      this.add_item_dialog  = true;
    },
    add_item: function() {
      store.dispatch("add_item", {
        topic: this.selected,
        item:  this.editing.updated
      });
      this.show_add_item_dialog(); // keep adding until cancel
    },

    edit_item: function(item) {
      this.editing.original = item;
      this.editing.updated  = null;
      this.edit_item_dialog = true;
    },
    update_item: function() {
      var o = JSON.stringify({...this.editing.original}),
          u = JSON.stringify({...this.editing.updated});
      if( o != u  ) {
        store.dispatch("update_item", {
          topic   : this.selected,
          original: this.editing.original,
          update  : this.editing.updated
        });
      }
    },
    delete_item: function(item) {
      if( confirm("Are you sure?") ) {
        store.dispatch("delete_item",{
          topic  : this.selected,
          removal: item        
        });
      }
    },

    import_success: function() {
      this.tab = 0;
    }
  },
  data: function() {
    return {
      tab: null,

      create_dialog: false,
      edit_dialog: false,
      add_item_dialog: false,
      edit_item_dialog: false,
      rename_dialog: false,
      tag_dialog: false,

      tags: [],

      new_topic: {
        name: "",
        question: {
          type: null
        }
      },

      edited_topic: {
        name: "",
        question: null
      },

      editing: {
        original: null,
        updated: null
      }
    }
  }
};

Navigation.add(Topics);
