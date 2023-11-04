Vue.component("MultiTextField", {
  props: [
    "model",
    "label",
    "focus",
    "showing"
  ],
  template: `
<div>
  <template v-for="(option, index) in model">
    <v-text-field v-model="model[index]"
                  :label="label"
                  ref="multitextfield"
                  :autofocus="focus && index == 0"
                  v-if="showing">
      <template v-slot:append-outer>
        <v-icon small color="red" @click="$emit('remove', index)">delete</v-icon>
      </template>
    </v-text-field>
  </template>
  <div style="text-align:right;">
    <v-icon small @click="$emit('add')">add</v-icon>
  </div>
</div>
`  
});
