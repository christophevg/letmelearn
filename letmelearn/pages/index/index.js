var Index = {
  template : `
<div>
  <h1>Hello World</h1>
  <div>
    <vue-form-generator ref="vfg" :schema="schema" :model="model" :options="formOptions" @validated="handleValidation"></vue-form-generator>
    <v-btn :loading="working" @click="get()" class="primary" :disabled="isInvalid">submit</v-btn>
  </div>  
</div>
`,
  computed: {
    isInvalid: function() {
      if( ! this.isValid ) { return true; }
      return this.model["name"] == "";
    }
  },
  methods: {
    handleValidation:function(isValid, errors){
      this.isValid = isValid;
    },
    get: function() {
      var self = this;
      $.ajax({
        url: "/api/hello",
        type: "get",
        data: { 
          name: this.model["name"], 
        },
        success: function(response) {
          self.working = false;
          app.$notify({
            group: "notifications",
            title: "Response...",
            text:  response.message,
            type:  "success",
            duration: 10000
          });
        },
        error: function(response) {
          app.$notify({
            group: "notifications",
            title: "Could not save user...",
            text:  response.responseText,
            type:  "warn",
            duration: 10000
          });
          self.working = false;
        }
      });
    }
  },
  data: function() {
    return {
      working: false,
      isValid : true,
      model: {
        "name": ""
      },
      schema: {
        fields: [
          {
            type: "input",
            inputType: "text",
            label: "Name",
            model: "name",
            readonly: false,
            required: true,
            placeholder: "Your name",
            validator: VueFormGenerator.validators.string
          }
        ]
      },
      formOptions: {
        validateAfterLoad: false,
        validateAfterChanged: true
      }
    }
  }
};

// add route and navigation entry

router.addRoutes([
  { path: '/', component: Index },
])

var groupSection = app.sections.find(function(item) {
  return "group" in item && item.group && item.text == "Index";
});
if(! groupSection ) {
  groupSection = {
    index      : 1,
    group      : true,
    icon       : "home",
    text       : "Index",
    subsections: []
  }
  app.sections.push(groupSection);
}

groupSection.subsections.push({
  icon  : "home",
  text  : "Index",
  path  : "/",
  index : 1    
});
