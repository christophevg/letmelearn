Vue.component("FolderSelector", {
  props: [ "value" ],
  template: `
<div>

  <v-text-field label="Folder" :value="path" :readonly="true"
                append-icon="folder" @click:append="select_folder"/>
  
  <!-- selection dialog -->

  <SimpleDialog :model="select_folder_dialog"
                v-if="select_folder_dialog"
                title="Selecteer..."
                submit_label="OK"
                cancel_label="Annuleer"
                @cancel="active = value ? [value.id] : []; select_folder_dialog = false;"
                @submit="$emit('change', selected); select_folder_dialog = false;">

    <v-toolbar dense flat>
  
      <v-spacer/>

      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn float icon @click="show_create_folder_dialog" v-on="on"><v-icon>create_new_folder</v-icon></v-btn>
        </template>
        <span>maak een nieuwe folder</span>
      </v-tooltip>

      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn float icon @click="delete_folder" :disabled="active.length == 0" v-on="on"><v-icon color="red">delete</v-icon></v-btn>
        </template>
        <span>verwijder geselecteerde folder</span>
      </v-tooltip>

    </v-toolbar>

    <v-card class="mx-auto" max-width="500">
      <v-card-text>

        <v-treeview
          :items="items"
          :open.sync="open"
          activatable
          :active.sync="active"
        >
          <template v-slot:prepend="{ item }">
            <v-icon v-if="item.children">folder</v-icon>
          </template>
        </v-treeview>
      </v-card-text>
    </v-card>
 
  </SimpleDialog>
  
  <!-- CREATE FOLDER DIALOG -->
  
  <SimpleDialog :model="create_folder_dialog"
                title="Maak een nieuw folder..."
                submit_label="Creëer..."
                cancel_label="Annuleer"
                :invalid="new_folder_name == null"
                @cancel="new_folder_name = null; create_folder_dialog = false;"
                @submit="create_folder_dialog = false; add_folder();">

    <span v-if="selected">
      Deze nieuwe folder zal worden aangemaakt onder<br><tt>{{ selected.name }}</tt>
    </span>
    <v-text-field label="Naam"
                  v-model="new_folder_name"
                  autofocus/>

  </SimpleDialog>

</div>
`,
  data: function() {
    return {
      select_folder_dialog: false,
      create_folder_dialog: false,
      active : [],
      search: null,
      caseSensitive: false,
      new_folder_name: null
    }
  },
  methods: {
    select_folder: function() {
      this.select_folder_dialog = true;
    },
    show_create_folder_dialog: function() {
      this.new_folder_name = "";
      this.create_folder_dialog = true;
    },
    add_folder: function() {
      store.dispatch("create_folder", { path: this.active, name: this.new_folder_name });
    },
    delete_folder: function() {
      store.dispatch("delete_folder", this.active);      
    }
  },
  computed: {
    open : {
      get : function() {
        return store.getters.open_folders;
      },
      set: function(selection) {
        store.commit("open_folders", selection);
      }
    },
    items: function() {
      return store.getters.folders;
    },
    selected: function() {
      var folder_id = null;
      if(this.active.length > 0) {
        folder_id = this.active[0];
      } else if(this.value) {
        folder_id = this.value.id;
      }
      return store.getters.folder(folder_id);
    },
    path: function() {
      if(! this.selected) { return ""; }
      return store.getters.path(this.selected.id)
        .map(function(topic) { return topic.name; })
        .join("/");
    }
  }
});
