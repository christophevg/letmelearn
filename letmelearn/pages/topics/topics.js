var Topics = {
  template : `
<ProtectedPage>
  <template v-slot:subheader>
    <TopicSelector/>
    <v-btn flat icon @click="show_create_topic_dialog">
      <v-icon>add</v-icon>
    </v-btn>
  </template>
  
  <v-tabs v-model="tab" v-if="selected">
    <v-tab>{{ selected.name }}</v-tab>
    <v-tab>Import</v-tab>

    <v-tab-item key="0" fluid>
      <v-card>
        <v-card-text>

<h2>
  {{ selected.name }}
<!--
  <v-btn flat icon @click="rename_dialog = true">
    <v-icon>edit</v-icon>
  </v-btn>
-->
  <v-btn flat icon @click="show_add_item_dialog">
    <v-icon>add</v-icon>
  </v-btn>
  
  <v-btn flat icon color="red" @click="remove">
    <v-icon>delete</v-icon>
  </v-btn>
</h2>

 <v-data-table
    :headers="headers"
    :items="selected.items"
    class="elevation-1"
  >
    <template v-slot:items="props">
      <td>{{ props.item.key }}</td>
      <td>{{ props.item.value }}</td>
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
  
</ProtectedPage>
`,
  navigation: {
    section: "learn",
    icon:    "edit",
    text:    "Topics",
    path:    "/topics",
    index:   2
  },
  computed: {
    selected: function() {
      return store.state.topics.selected;
    }
  },
  methods: {
    show_create_topic_dialog: function() {
      this.create_dialog = true;
      setTimeout(() => {
        this.$refs.new_topic_name.focus();
      }, 200);
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
    remove: function() {
      store.dispatch("remove_topic", this.selected);
    },
    import_topic: function() {
      var items = this.topic_to_import.split("\n").map(function(item_to_import){
        var parts = item_to_import.split("\t");
        return { key: parts[0], value: parts[1] }
      });
      store.dispatch("update_topic", {
        _id: this.selected._id,
        name: this.selected.name,
        items: items
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
        this.show_add_item_dialog();
      }
    }
  },
  data: function() {
    return {
      tab: null,
      topic_to_import: "",
      rename_dialog: false,
      create_dialog: false,
      add_item_dialog: false,
      new_topic_name: null,
      new_item: {
        key: null,
        value: null
      },
      headers: [
        {
          text: "Key",
          align: "left",
          sortable: true,
          value: "key"
        },
        {
          text: "Value",
          align: "left",
          sortable: true,
          value: "value"
        }
      ]
    }
  }
};

Navigation.add(Topics);
