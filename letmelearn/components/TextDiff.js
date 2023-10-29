Vue.component("TextDiff", {
  props : [ "expected", "actual" ],
  template: `
<div>
  <template v-for="chunk in diff">
    <span :style="style.added"   v-if="chunk.added">{{ chunk.value.replace(" ", "&nbsp;") }}</span>
    <span :style="style.removed" v-else-if="chunk.removed">{{ chunk.value.replace(" ", "&nbsp;") }}</span>
    <span :style="style.default" v-else>{{ chunk.value }}</span>
  </template>
</div>  
`,
  computed: {
    diff: function() {
      return JsDiff.diffChars(this.expected, this.actual);
    }
  },
  data: function() {
    return {
      style : {
        added  : "text-decoration:none;color:#b30000;background:#fadad7;",
        removed: "text-decoration:none;background:#eaf2c2;color:#406619;",
        default: "text-decoration:none;"
      }
    }
  }
});
