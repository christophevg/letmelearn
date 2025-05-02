store.registerModule("topics", {
  state: {
    _question_types   : [],     // all known question types
    _folders          : [],     // folders
    _open_folders     : [],     // opened folders
    _topics           : [],     // all known topics
    _selected_items   : [],     // mix of selected items (folders and topics)
    _quiz             : [],     // shuffled items from all selected topics
    _count            : 0       // to force shuffling
  },
  getters: {
    question_types: function(state) {
      return state._question_types;
    },
    question_type: function(state, getters) {
      return function(name) {
        return getters.question_types.find(function(question) {
          return question.name == name;
        });        
      }
    },

    item: function(state, getters) {
      return function(id) {
        return getters.folder(id) || getters.topic(id);
      }
    },

    folders_and_topics: function(state) {
      return state._folders;
    },
    folders: function(state, getters) {
      const folders_only = JSON.parse(JSON.stringify(getters.folders_and_topics));
      function recurse(items) {
        // prune this list
        items = items.filter(function(item) { return "children" in item });
        // recurse down in all children, pruning them
        for(const item of items) {
          item.children = recurse(item.children);
        }
        return items;
      }
      return recurse(folders_only);
    },

    folder : function(state, getters) {
      return function(id) {

        function recurse(items) {
          for(const item of items) {
            if( "children" in item && item.id == id ) {
              return item;
            }
            if( item.children ) {
              const lower = recurse(item.children);
              if(lower) { return lower; }
            }
          }
          return null;
        }
        return recurse(getters.folders);
      }
    },
    open_folders: function(state) {
      return state._open_folders;
    },
    
    path2topic: function(state, getters) {
      return function(id) {
        function recurse(items, path) {
          for(const item of items) {
            if( item.id == id ) {
              return path;
            }
            if(item.children) {
              const lower = recurse(item.children, item.id);
              if(lower) { return lower; }
            }
          }
          return null;
        }
        const path = recurse(getters.folders_and_topics, "");
        if(path) { return path }
        return null;
      }
    },

    topics: function(state) {
			return state._topics;
    },
    topic : function(state, getters) {
      return function(id) {
        return getters.topics.find(function(topic) {
          return topic._id == id;
        });
      }
    },

    selected_items2 : function(state, getters) {
      return state._selected_items;
    },

    selected_topics: function(state, getters) {
      // expands the list of selected topics to include their folder
      return state._selected_items
        .filter(function(item) { return !("children" in item )})
        .map(function(topic){
          return {
            _id     : topic._id,
            name    : topic.name,
            question: topic.question,
            tags    : topic.tags || [],
            items   : topic.items,
            folder  : getters.path2topic(topic._id)
          }
        });
    },

    selected_hash: function(state, getters) {
      return getters.selected_topics.map(function(topic){ return topic._id; }).join(";");
    },
		selected_items: function(state, getters) {
      // return flat list of all items (an item is a question/answer pair)
      // along with their parent-topic
      // this is needed because multiple topics can be selected, resulting in
      // a list of all their items
			return getters.selected_topics.reduce(function(all_items, topic) {
        all_items.push(...topic.items.map(function(item){
          return {
            topic    : {
              _id      : topic._id,
              name     : topic.name,
              question : topic.question,
              tags     : topic.tags
            },
            item     : item
          } 
        }));
				return all_items;
			}, []);
		},
    quiz: function(state) {
      return state._quiz;
    },
    shuffled : function(state, getters) {
      state._count; // forces recompute
      // spread it to avoid selected_items to be sorted
      return [...getters.selected_items].sort(() => Math.random() - 0.5);
    },
    current_question(state) {
      if(state._quiz[0]) { return state._quiz[0]}
      return null
    }
  },
  actions: {
    
    // FOLDER ACTIONS
    
    load_folders: function(context) {
      if(context.getters.folders.length < 1) {
        $.ajax({
          type: "GET",
          url: "/api/folders",
          dataType: "json",
          success: function(result) {
            context.commit("folders", result);
          },
          error: function(result) {
            store.dispatch(
              "raise_error",
              "er ging iets mis, probeer het opnieuw: " + result.statusText
            );
          }
        });
      }      
    },
    
    create_folder: function(context, folder) {
      $.ajax({
        type: "POST",
        url: `/api/folders/${folder.path}`,
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({ name: folder.name }),
        success: function(folders) {
          context.commit("folders", folders);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });
    },

    delete_folder: function(context, folder) {
      $.ajax({
        type: "DELETE",
        url: `/api/folders/${folder}`,
        contentType: "application/json",
        dataType: "json",
        success: function(folders) {
          context.commit("folders", folders);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });
    },
    
    // TOPIC ACTIONS
    
    load_topics: function(context) {
      if(context.getters.topics.length < 1) {
        $.ajax({
          type: "GET",
          url: "/api/topics",
          dataType: "json",
          success: function(topics) {
            context.commit("topics", topics);
            // adopt hash
            if(window.location.hash) {
              var topic_ids = window.location.hash.substring(1);
							var topics = topic_ids.split(";").map(function(id){
								return store.getters.topic(id);
							});
              context.commit("selected_items", topics);
            }
          },
          error: function(result) {
            store.dispatch(
              "raise_error",
              "er ging iets mis, probeer het opnieuw: " + result.statusText
            );
          }
        });
      }

      
    },
    update_topic: function(context, updating) {
      console.log("updating", updating);
      $.ajax({
        type: "PATCH",
        url: "/api/topics/" + updating.topic._id,
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(updating.update),
        success: function(result) {
          context.commit("updated_topic", result.topic);
          context.commit("folders",       result.folders);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });
    },
    create_topic: function(context, topic) {
      $.ajax({
        type: "POST",
        url: "/api/topics",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          name    : topic.name,
          question: topic.question
        }),
        success: function(new_topic) {
          context.commit("new_topic", new_topic);
          store.dispatch("add_feed_item", {
            "kind" : "new topic",
            "topic" : new_topic["_id"]
          });
          if(topic.handler) { topic.handler(new_topic); }
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });
    },
    remove_topic: function(context, topic) {
      $.ajax({
        type: "DELETE",
        url: "/api/topics/" + topic._id,
        success: function(result) {
          context.commit("removed_topic", topic);
          context.commit("folders",       result.folders);
          context.commit("new_feed",      result.feed);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });
    },

    // ITEM ACTIONS

    add_item: function(context, adding) {
      $.ajax({
        type: "POST",
        url: "/api/topics/" + adding.topic._id + "/items",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(adding.item),
        success: function(result) {
          context.commit("added_item", adding);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });
    },
    update_item: function(context, updating) {
      $.ajax({
        type: "PATCH",
        url: "/api/topics/" + updating.topic._id + "/items",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          original: updating["original"],
          update: updating["update"]
        }),
        success: function(result) {
          context.commit("updated_item", updating);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });      
    },
    delete_item: function(context, removing) {
      $.ajax({
        type: "DELETE",
        url: "/api/topics/" + removing.topic._id + "/items",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(removing.removal),
        success: function(result) {
          context.commit("removed_item", removing);
        },
        error: function(result) {
          store.dispatch(
            "raise_error",
            "er ging iets mis, probeer het opnieuw: " + result.statusText
          );
        }
      });      
    },
    
    // QUIZ ACTIONS
    
    create_quiz: function(context) {
      // spread it to ensure a clean/local quiz list
      context.commit("quiz", [...context.getters.shuffled]);
    },
    clear_quiz: function(context, topic) {
      context.commit("quiz", []);
    }
  },
  mutations: {
    question_type: function(state, new_question) {
      // register a question type to the known questions
      state._question_types.push(new_question);
    },
    
    folders: function(state, new_folders) {
      // import a new set of folders, including leafs with a topic id
      Vue.set(state, "_folders", new_folders);
    },
    new_folder: function(state, new_folder) {
      // create a new folder below new_folder.parent, generating id as the
      // path to it, concatenating new_folder.name to its parents' names
      function recurse(folders, path) {
        for(const folder of folders) {
          if(folder.id == new_folder.parent) {
            folder.children.push({
              id: path.concat(folder.name).concat(new_folder.name).join("/"),
              name: new_folder.name,
              children: []
            })
            return;
          }
          if(folder.children) {
            recurse(folder.children, path.concat(folder.name));
          }
        }
      }
      recurse(state._folders, []);
    },
    open_folders: function(state, selection) {
      Vue.set(state, "_open_folders", selection);
    },
    
    topics: function(state, new_topics) {
      // import a new set of topics, adding default tags if needed
      Vue.set(state, "_topics", new_topics.map(function(topic){
        if(!topic.tags) { topic.tags = []; }
        return topic;
      }));
    },
    new_topic: function(state, new_topic) {
      // add a new topic
      state._topics.push(new_topic);
    },

    selected_items: function(state, selection) {
      Vue.set(state, "_selected_items", selection);      
      // update hash to reflect current state
      window.location.hash = selection
      .filter(function(item) { return !("children" in item)}) // only topics
      .map(function(topic){
      	if( topic && topic._id ) {
          return topic._id;
        }
        return null;
      }).filter(function(topic) { return topic != null; }).join(";");
    },

    updated_topic: function(state, updated) {
      var new_topic = null;
      var new_topics = state._topics.map(function(topic) {
        if(topic._id == updated._id) {
          new_topic = Object.assign({}, topic, updated);
          return new_topic;
        }
        return topic;
      });
      Vue.set(state, "_topics", new_topics);
      state._selected_items = state._selected_items.map(function(selected){
        if(selected._id == updated._id) {
          return new_topic;
        }
        return selected;
      });
    },
    removed_topic: function(state, removed) {
			// filter from all topics
      state._topics = state._topics.filter(function(topic){
        return topic._id != removed._id;
      });
			// filter from selected topics
			state._selected_items = state._selected_items.filter(function(topic){
				return topic._id != removed._id;
			});
      // TODO: clean up window.hash
    },
    added_item: function(state, added) {
      state._topics.find(function(topic) {
        return topic._id == added.topic._id;
      }).items.push(added.item);
    },
    updated_item: function(state, updated) {
      var item = state._topics.find(function(topic) {
        return topic._id == updated.topic._id;
      }).items.find(function(item){
        return JSON.stringify(item) == JSON.stringify(updated.original);
      });
      Object.keys(item).map(function(prop) {
        Vue.set(item, prop, updated.update[prop]);
      });
    },
    removed_item: function(state, removed) {
      var topic = state._topics.find(function(topic) {
        return topic._id == removed.topic._id;
      })
      topic.items = topic.items.filter(function(item){
        return JSON.stringify(item) != JSON.stringify(removed.removal);
      });
    },
    quiz: function(state, new_quiz) {
      Vue.set(state, "_quiz", new_quiz);
      state._count++;
    },
    mark_correct: function(state) {
      state._quiz.shift();
    },
    mark_incorrect: function(state) {
      state._quiz.push(state._quiz.shift())
    }
  }
});

Vue.component("FolderSelector", {
  props: [ "value" ],
  template: `
<div>

  <v-text-field label="Folder" :value="selected" :readonly="true"
                append-icon="folder" @click:append="select_folder"/>
  
  <!-- selection dialog -->

  <SimpleDialog :model="select_folder_dialog"
                v-if="select_folder_dialog"
                title="Selecteer..."
                submit_label="OK"
                cancel_label="Annuleer"
                @cancel="active = [value]; select_folder_dialog = false;"
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
      Deze nieuwe folder zal worden aangemaakt onder<br><tt>{{ selected }}</tt>
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
      return this.active.length > 0 ? this.active[0] : this.value;
    }
  }
});

Vue.component("TopicSelector", {
  props: {
    multiple: Boolean,
    tags: Boolean
  },
  template: `
<div v-if="topics.length > 0">

  <v-badge left overlap :value="current.length > 0">
    <template v-slot:badge v-if="current.length > 1">
      <span>{{ current.length }}</span>
    </template>
    <v-chip @click="show_tree">
      <span v-if="current.length==1">{{ current[0] }}</span>
      <v-avatar><v-icon right>folder</v-icon></v-avatar>
    </v-chip>
  </v-badge>

  <!-- EDIT TOPIC -->

  <SimpleDialog :model="tree_dialog"
                title="Selecteer..."
                cancel_label="OK"
                @cancel="tree_dialog = false;">

    <v-card class="mx-auto" max-width="500">
      <v-card-text>
        <v-treeview
          v-model="selected"
          :items="items"
          :open.sync="open"
          :selectable="multiple"
          activatable
          :active.sync="activated"
          open-on-click
        >
          <template v-slot:prepend="{ item }">
            <v-icon v-if="item.children">folder</v-icon>
          </template>
        </v-treeview>
      </v-card-text>
    </v-card>

  </SimpleDialog>
</div>
`,
  data: function() {
    return {
      tree_dialog: false,
      active     : [],
      selection  : []
    }
  },
  methods: {
    show_tree: function() {
      this.tree_dialog = true;
    }
  },
  computed: {
    topics: function() {
      return store.getters.topics.map(function(topic) {
        return {
          id  : topic._id,
          name: topic.name
        }
      }).filter(function(topic) {
          if("tags" in topic) {
            return !topic.tags.includes("archived");
          }
          return true;
        })
        .sort(function(a, b) {
          const nameA = a.name.toUpperCase();
          const nameB = b.name.toUpperCase();
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });
    },
    items: function() {
      // make dict of topics, to track which are in the tree already,
      // to be able to add un-foldered ones later
      var topics = Object.fromEntries(this.topics.map(function(topic) {
        return [ topic.id, topic.name ];
      }));

      function recurse(tree) {
        for(const item of tree) {
          if(item.children) {
            recurse(item.children);
          } else {
            if(item.id in topics) {
              delete topics[item.id]
            }
          }
        }
      }
      const folders = [...store.getters.folders_and_topics];
      recurse(folders);

      // add remaining "unfoldered" topics
      for(const [key, value] of Object.entries(topics)) {
        folders.push({
          id  : key,
          name: value
        });
      }
      return folders;
    },
    current : function() {
      return store.getters.selected_topics.map(function(item) { return item._id }); 
    },
    open : {
      get : function() {
        return store.getters.open_folders;
      },
      set: function(selection) {
        store.commit("open_folders", selection);
      }
    },
    selected : {
      get: function() {
        if(this.multiple) {
          return store.getters.selected_items2.map(function(item) { return "children" in item ? item.id : item._id });
        }
        return this.selection;
      },
      set: function(selection) {
        if(this.multiple) {
          // in multiple selection mode, keep activated items local
          store.commit("selected_items", selection.map(function(key){ return store.getters.item(key)}));
          return;
        }
        // in single selection mode, the active one is the selected one
        this.selection = selection;          
      }
    },
    activated: {
      get: function() {
        if(this.multiple) {
          // in multiple selection mode, keep activated items local
          return this.active;
        }
        // in single selection mode, the active one is the selected one
        return store.getters.selected_items2.map(function(item) { return "children" in item ? item.id : item._id });
      },
      set: function(selection) {
        if(this.multiple) {
          // in multiple selection mode, keep activated items local
          this.active = selection;          
          return;
        }
        // in single selection mode, the active one is the selected one
        store.commit("selected_items", selection.map(function(key){ return store.getters.item(key)}));
      }
    }
  }
});
