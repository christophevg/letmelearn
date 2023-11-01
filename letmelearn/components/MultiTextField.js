Vue.component("MultiTextField", {
  props: [
    "model",
    "label",
    "focus"
  ],
  template: `
<div>
  <template v-for="(option, index) in model">
    <v-text-field v-model="model[index]"
                  :label="label"
                  ref="multitextfield">
      <template v-slot:append-outer>
        <v-icon small color="red" @click="$emit('remove', index)">delete</v-icon>
      </template>
    </v-text-field>
  </template>
  <div style="text-align:right;">
    <v-icon small @click="$emit('add')">add</v-icon>
  </div>
</div>
`,
  mounted: function() {
    if(this.focus) {
      setTimeout(() => { this.$refs.multitextfield[0].focus() }, 200);
    }
  }
});
