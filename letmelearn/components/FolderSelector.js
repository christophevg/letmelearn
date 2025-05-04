Vue.component("FolderSelector", {
  props: [ "value" ],
  template: `
<div>

  <v-text-field label="Folder" :value="path" :readonly="true"
                append-icon="folder"
                @click="select_folder"
                @click:append="select_folder"/>
  
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
      Deze nieuwe folder zal worden aangemaakt in<br>
      <tt>{{ selected.name }}</tt>
    </span>
    <v-text-field label="Naam" v-model="new_folder_name" autofocus  v-if="create_folder_dialog"/>

  </SimpleDialog>

</div>
`,
  data: function() {
    return {
      select_folder_dialog: false,
      create_folder_dialog: false,
      activated : [],
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
    active : {
      // active is a list of id's that are active (visually selected), only 1
      get : function() {
        // return activated item, else return provided value
        return this.activated.length > 0 ? this.activated
             : this.value ? [ this.value.id ] : [];
      },
      set : function(selection) {
        this.activated = selection;
      }
    },
    open : {
      // redirect open folders to store to sync with other treeviews
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
      // transforms active id into folder object
      return store.getters.folder(this.active[0]);
    },
    path: function() {
      // returns string representation of the folders up to the selected item
      // Name / Name / Name ...
      if(! this.selected) { return ""; }
      return store.getters.path(this.selected.id)
        .map(function(folder) { return folder.name; })
        .join("/");
    }
  }
});
