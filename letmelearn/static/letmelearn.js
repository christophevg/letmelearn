(function() {
  $("#submit").click(function(){
    $.ajax( {
      url: "/api/hello",
      data: { "name" : $("#name").val() },
      type: "GET",
      dataType: "json",
      contentType: "application/json",
      success: function(response) {
        $("#result").html(response.message);
      },
      error: function(response) {
        $("#result").html(JSON.stringify(response));
      }
    });
  })
})();
