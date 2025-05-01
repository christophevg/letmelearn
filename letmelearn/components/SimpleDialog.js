Vue.component("SimpleDialog", {
  props: {
    "model" : Boolean,
    "title" : String,
    "cancel_label" : {
      type: String,
      default: "Annuleer"
    },
    "submit_label" : String,
    "invalid" : Boolean
  },
  template: `
  <v-dialog v-model="model" persistent width="500"  @keydown.esc="$emit('cancel')">
    <v-form @submit.prevent="$emit('submit')">
      <v-card>
        <v-card-title class="headline grey lighten-2" primary-title>
          {{ title }}
        </v-card-title>

        <v-card-text>
          <slot/>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-btn color="secondary" flat @click="$emit('cancel')">{{ cancel_label }}</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" flat :disabled="invalid" type="submit">{{ submit_label }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
`
});
