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
        <v-btn flat icon @click="show_create_topic_dialog" class="ma-0">
          <v-icon>add</v-icon>
        </v-btn>
        <v-btn flat icon color="red" @click="delete_topic" :disabled="!selected" class="ma-0">
          <v-icon>delete</v-icon>
        </v-btn>

        <v-btn flat icon @click="show_tag_dialog" :disabled="!selected" class="ma-0">
          <v-icon>bookmark</v-icon>
        </v-btn>
  
        <!--
          <v-btn flat icon @click="rename_dialog = true" :disabled="!selected" class="ma-0">
            <v-icon>edit</v-icon>
          </v-btn>
        -->
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
            <template v-slot:items="props">
              <td>{{ props.item.key }}</td>
              <td style="padding: 0px">{{ props.item.value }}</td>
              <td width="48px" class="justify-right" style="padding: 0px;">
                <v-icon small class="mr-2" @click="edit_item(props.item)">edit</v-icon>
                <v-icon small @click="delete_item(props.item)" color="red">delete</v-icon>
              </td>
            </template>
          </v-data-table>

        </v-card-text>
      </v-card>      
    </v-tab-item>

    <v-tab-item key="1" fluid>
      <v-card>
        <v-card-text>

          <p>

            Paste items, one item per row, separating word and translation by a
            <code>tab</code>. Next press <code>import</code>.

          </p>

          <v-textarea v-model="topic_to_import"
                      label="Topic to import..."
                      auto-grow></v-textarea>

          <v-btn @click="import_topic()">
            <v-icon>save_alt</v-icon> import...
          </v-btn>
          
        </v-card-text>
      </v-card>      
    </v-tab-item>
  </v-tabs>
  
  <v-dialog v-model="create_dialog" persistent width="500">
    <v-form @submit.prevent="create_dialog = false; create_topic()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Create a new topic...
        </v-card-title>

        <v-card-text>
          Enter a descriptive name for the new topic:
          <v-text-field label="Topic" required v-model="new_topic_name" ref="new_topic_name"></v-text-field>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
            <v-btn color="secondary" flat @click="new_topic_name = null; create_dialog = false">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" flat type="submit">Create...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

  <v-dialog v-model="tag_dialog" persistent width="500">
    <v-form @submit.prevent="tag_dialog = false; update_tags()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Tags for this topic...
        </v-card-title>

        <v-card-text>
          
          <p>
          
            Voeg "tags" toe om deze topic te identificeren. De enter/return
            knop maakt van je text een tag.
          
          </p>

          <v-combobox v-model="tags" chips deletable-chips multiple></v-combobox>

        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn color="secondary" flat @click="selected.tags = []; tag_dialog = false">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat type="submit">Update...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

  
  <v-dialog v-model="add_item_dialog" persistent width="500px">
    <v-form @submit.prevent="add_item_dialog = false; add_item()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Add a new item...
        </v-card-title>

        <v-card-text>
          <v-text-field v-model="new_item.key" label="Key" ref="new_item_key"></v-text-field><br>
          <v-text-field v-model="new_item.value" label="Value"></v-text-field>
        </v-card-text>

        <v-card-actions>
          <v-btn color="secondary" flat @click="new_item.key = null; add_item_dialog = false">Cancel</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat type="submit">Add...</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>

  <v-dialog v-model="edit_item_dialog" persistent width="500px">
    <v-form @submit.prevent="edit_item_dialog = false; update_item()">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          Update item...
        </v-card-title>

        <v-card-text>
          <v-text-field v-model="editable_item.key" label="Key" ref="edit_item_key"></v-text-field><br>
          <v-text-field v-model="editable_item.value" label="Value"></v-text-field>
        </v-card-text>

        <v-card-actions>
          <v-btn color="secondary" flat @click="editable_item.key = null; edit_item_dialog = false">Cancel</v-btn>
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
    }
  },
  methods: {
    show_create_topic_dialog: function() {
      this.create_dialog = true;
      setTimeout(() => {
        this.$refs.new_topic_name.focus();
      }, 200);
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
    show_add_item_dialog: function() {
      this.new_item.key = null;
      this.new_item.value = null;
      this.add_item_dialog = true;
      setTimeout(() => {
        this.$refs.new_item_key.focus();
      }, 200);
    },
    create_topic: function() {
      if( this.new_topic_name ) {
        store.dispatch("create_topic", {
          name: this.new_topic_name,
          items: [],
          handler: function(created) {
            store.commit("selected_topic", store.getters.topic(created._id))
          }
        })
      }
    },
    delete_topic: function() {
      if( confirm("Deleting topic " + this.selected.name + " ... Are you sure?")) {
        store.dispatch("remove_topic", this.selected);
      }
    },
    update_tags: function() {
      store.dispatch("update_topic", {
        topic : this.selected,
        update: {
          tags: this.tags
        }
      });
    },
    import_topic: function() {
      var items = this.topic_to_import.split("\n").map(function(item_to_import){
        var parts = item_to_import.split("\t");
        return { key: parts[0], value: parts[1] }
      });
      store.dispatch("update_topic", {
        topic: this.selected,
        update: {
          items: items
        }
      });
      this.topic_to_import = "";
      this.tab = 0;
    },
    add_item: function() {
      if( this.new_item.key ) {
        store.dispatch("add_item", {
          topic: this.selected,
          item:  {
            key: this.new_item.key,
            value : this.new_item.value
          }
        });
        this.show_add_item_dialog(); // keep adding until cancel
      }
    },
    edit_item: function(item) {
      this.editable_item.original = item;
      this.editable_item.key = item.key;
      this.editable_item.value = item.value;
      this.edit_item_dialog = true;
    },
    update_item: function() {
      if(  this.editable_item.key && (
           this.editable_item.key   != this.editable_item.original.key
        || this.editable_item.value != this.editable_item.original.value ) ) {
        store.dispatch("update_item", {
          topic : this.selected,
          update: this.editable_item
        });
      }
    },
    delete_item: function(item) {
      if( confirm("Deleting item " + item.key + " ... Are you sure?")) {
        store.dispatch("delete_item",{
          topic  : this.selected,
          removal: item        
        });
      }
    }
  },
  data: function() {
    return {
      tab: null,
      topic_to_import: "",
      create_dialog: false,
      add_item_dialog: false,
      edit_item_dialog: false,
      rename_dialog: false,
      tag_dialog: false,
      tags: [],
      new_topic_name: null,
      new_item: {
        key: null,
        value: null
      },
      editable_item: {
        original: null,
        key: null,
        value: null
      },
      headers: [
        { text: "Key",   align: "left", sortable: true,  value: "key"   },
        { text: "Value", align: "left", sortable: true,  value: "value" },
        { text: "",                     sortable: false, value: "key"   }
      ]
    }
  }
};

Navigation.add(Topics);
