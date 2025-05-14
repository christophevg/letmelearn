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
      
      const treeitems = JSON.parse(JSON.stringify(store.getters.treeitems));
      recurse(treeitems);

      // add remaining "unfoldered" topics
      for(const [key, value] of Object.entries(topics)) {
        treeitems.push({
          id  : key,
          name: value
        });
      }
      return treeitems;
    },
    current : function() {
      return store.getters.selected_topics.map(function(item) { return item.name }); 
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
          return store.getters.selected_treeitems.map(function(item) { return "children" in item ? item.id : item._id });
        }
        return this.selection;
      },
      set: function(selection) {
        if(this.multiple) {
          // keep multiple selected items in the store
          store.commit("selected_items", selection.map(function(key){ return store.getters.item(key)}));
          return;
        }
        // in single selection mode, the active one is the selected one, so keep selected items local
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
        return store.getters.selected_treeitems.map(function(item) { return "children" in item ? item.id : item._id });
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
