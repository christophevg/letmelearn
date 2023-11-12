Vue.component("SimpleDialog", {
  props: [
    "model",
    "title",
    "submit_label",
    "invalid"
  ],
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
            <v-btn color="secondary" flat @click="$emit('cancel')">Annuleer</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" flat :disabled="invalid" type="submit">{{ submit_label }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
`
});
