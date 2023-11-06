var Topics = {
  template: `
<ProtectedPage>

  <!-- toolbars -->

  <template v-slot:subheader>

    <TopicSelector/>

    <v-btn flat icon @click="show_create_topic_dialog" class="ma-0">
      <v-icon>add</v-icon>
    </v-btn>

    <v-btn flat icon @click="show_edit_topic_dialog" :disabled="!selected" class="ma-0">
      <v-icon>edit</v-icon>
    </v-btn>

    <v-btn flat icon @click="show_tag_dialog" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>bookmark</v-icon>
    </v-btn>

    <v-btn flat icon color="red" @click="delete_topic" :disabled="!selected" class="ma-0" v-if="!show_in_menu">
      <v-icon>delete</v-icon>
    </v-btn>

    <v-menu bottom left v-if="show_in_menu">
      <template v-slot:activator="{ on }">
        <v-btn
          flat
          icon
          v-on="on"
        >
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-tile>

          <v-btn flat icon @click="show_tag_dialog" :disabled="!selected" class="ma-0">
            <v-icon>bookmark</v-icon>
          </v-btn>

        </v-list-tile>
        <v-list-tile>

          <v-btn flat icon color="red" @click="delete_topic" :disabled="!selected" class="ma-0">
            <v-icon>delete</v-icon>
          </v-btn>

        </v-list-tile>
      </v-list>
    </v-menu>

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
  
  <SimpleDialog :model="create_dialog"
                title="Maak een nieuw ontwerp..."
                submit_label="Creëer..."
                cancel_label="Annuleer"
                @cancel="new_topic.name = null; create_dialog = false;"
                @submit="create_dialog = false; create_topic();">

    Geef een duidelijke omschrijving voor dit onderwerp:
    <v-text-field label="Naam"
                  required
                  v-model="new_topic.name"
                  ref="new_topic_name"/>

    Kies de soort vraag voor dit ontwerp:
    <v-select :items="question_types"
              item-text="title"
              item-value="name"
              v-model="new_topic.question.type"
              label="Soort"
              @change="question_type_selected"/>

    <div v-if="question_type">
      <v-alert :value="true" color="info" icon="info" outline>
        {{ question_type.desc }}
      </v-alert>

      <br>

      Geef een passende omschrijving voor elk deel van de vragen:
      <v-text-field v-for="(label, prop, index) in question_type.labels"
                    :key="index"
                    :label="label"
                    required
                    v-model="new_topic.question.labels[prop]"/>

      <div v-if="question_type.props.topic">
        Geef elk van onderstaande configuratie parameters een juiste invulling:
        <template v-for="(config, prop, index) in question_type.props.topic">
          <MultiTextField v-if="config.multi"
                          :model="new_topic.question.props[prop]"
                          :label="question_type.labels[prop]"
                          @remove="(index) => { new_topic.question.props[prop].splice(index, 1) }"
                          @add="new_topic.question.props[prop].push('')"
                          :showing="true"/>
          <v-text-field v-else
                        :key="index"
                        :label="question_type.labels[prop]"
                        required
                        v-model="new_topic.question.props[prop]"/>
      
        </template>
      </div>
    </div>

  </SimpleDialog>

  <!-- EDIT TOPIC -->

  <SimpleDialog v-if="selected"
                :model="edit_dialog"
                title="Werk deze topic bij..."
                submit_label="Werk bij..."
                cancel_label="Annuleer"
                @cancel="edited_topic.name = null; edit_dialog = false;"
                @submit="edit_dialog = false; update_topic();">

    <v-text-field label="Naam" required v-model="edited_topic.name" ref="edited_topic_name"/>

    <v-text-field label="Soort" required :value="selected_type.title" :disabled="true"/>

    <v-text-field v-for="(_, prop, index) in edited_topic.question.labels"
                  :key="index"
                  :label="selected_type.labels[prop]"
                  required
                  v-model="edited_topic.question.labels[prop]"/>
    
    <template v-for="(config, prop, index) in selected_type.props.topic" v-if="edited_topic.question.props">
      <MultiTextField v-if="config.multi"
                      :model="edited_topic.question.props[prop]"
                      :label="selected_type.labels[prop]"
                      @remove="(index) => { edited_topic.question.props[prop].splice(index, 1) }"
                      @add="edited_topic.question.props[prop].push('')"
                      :showing="true"/>
      <v-text-field v-else
                    :key="index"
                    :label="question_type.labels[prop]"
                    required
                    v-model="edited_topic.question.props[prop]"/>
    </template>    

  </SimpleDialog>

  <!-- EDIT TAGS -->

  <SimpleDialog :model="tag_dialog"
                title="Tag deze topic..."
                submit_label="Werk bij..."
                cancel_label="Annuleer"
                @cancel="tag_dialog = false;"
                @submit="tag_dialog = false; update_tags();">

    Voeg "tags" toe om deze topic te identificeren. De enter/return knop maakt
    van je text een tag.

    <v-combobox v-model="tags" chips deletable-chips multiple></v-combobox>

  </SimpleDialog>

  <!-- ADD ITEM -->
  
  <SimpleDialog :model="add_item_dialog"
                title="Voeg een nieuw item toe..."
                submit_label="Voeg toe..."
                cancel_label="Annuleer"
                @cancel="add_item_dialog = false;"
                @submit="add_item_dialog = false; add_item();">

    <component editor :is="selected.question.type"
                      v-if="selected"
                      :topic="selected"
                      :item="this.editing"
                      :showing="add_item_dialog"/>

  </SimpleDialog>

  <!-- EDIT ITEM -->

  <SimpleDialog :model="edit_item_dialog"
                title="Werk dit item bij..."
                submit_label="Werk bij..."
                cancel_label="Annuleer"
                @cancel="edit_item_dialog = false;"
                @submit="edit_item_dialog = false; update_item();">

    <component editor :is="selected.question.type"
                      v-if="selected"
                      :topic="selected"
                      :item="this.editing"
                      :showing="edit_item_dialog"/>

  </SimpleDialog>
  
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
    show_in_menu: function() {
      return this.$vuetify.breakpoint.name == "xs";
    },
    selected: function() {
			return store.state.topics.selected.length == 1 ? store.state.topics.selected[0] : null;
    },
    selected_type: function() {
      return this.selected ? store.getters.question(this.selected.question.type) : null;
    },
    topic_headers: function() {
      return store.getters.question(this.selected.question.type).headers;
    },
    headers: function() {
      var self = this;
      return this.topic_headers.map(function(header){
        return {
          text: self.selected.question.labels[header],
          align: "left",
          sortable: true,
          value: header
        };
      }).concat([
        { text: "", sortable: false, value: "item" }
      ])
    },
    question_types: function() {
      return store.getters.questions;
    },
    question_type: function() {
      if(this.new_topic.question.type) {
        return store.getters.question(this.new_topic.question.type);
      }
      return null;
    }
  },
  methods: {

    // TOPICS

    show_create_topic_dialog: function() {
      this.new_topic = { name: "", question: { type: null }};
      this.create_dialog  = true;
      setTimeout(() => { this.$refs.new_topic_name.focus(); }, 200);
    },
    question_type_selected: function() {
      // prepare the question configuration, start fresh
      var config = {
        type: this.new_topic.question.type,
        labels: {}
      }
      // add all question properties (labels)
      for(var prop in this.question_type.props.questions) {
        config.labels[prop] = "";
      }
      // add optional topic properties (configuration)
      if( this.question_type.props.topic ) {
        config.props = {};
        for(var prop in this.question_type.props.topic) {
          config.props[prop] = this.question_type.props.topic[prop].multi ? [""] : "";
        }
      }
      this.new_topic.question = config;
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
      this.edited_topic.question = {
        type  : this.selected.question.type,
        labels: {...this.selected.question.labels}
      }
      if(this.selected.question.props) {
        Vue.set(this.edited_topic.question, "props", {});
        for(var prop in this.selected.question.props) {
          Vue.set(this.edited_topic.question.props, prop, 
            Array.isArray(this.selected.question.props[prop]) ?
              [...this.selected.question.props[prop]]
            : this.selected.question.props[prop]);
        }
      }
      this.edit_dialog = true;
      setTimeout(() => { this.$refs.edited_topic_name.focus(); }, 200);
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
      if( confirm("Ben je zeker dat " + this.selected.name + " weg mag?")) {
        store.dispatch("remove_topic", this.selected);
      }
    },
    
    // TAGS
    
    show_tag_dialog: function() {
      // copy pre-existing tags
      if(this.selected.tags) {
        this.tags = [...this.selected.tags];
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

    // ITEMS

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
      if( confirm("Ben je zeker?") ) {
        store.dispatch("delete_item",{
          topic  : this.selected,
          removal: item        
        });
      }
    },

    // IMPORT

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
        question: {
          type: null,
          labels: {}
        }
      },

      editing: {
        original: null,
        updated: null
      }
    }
  }
};

Navigation.add(Topics);
