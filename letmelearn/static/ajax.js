function api(method, endpoint, success, data) {
  const request = {
    type: method,
    url: "/api/" + endpoint,
    contentType: "application/json",
    dataType: "json",
    success: success,
    error: function(result) {
      store.dispatch(
        "raise_error",
        "er ging iets mis, probeer het opnieuw: " + result.statusText
      );
    }
  };
  if(data) {
    request.data = JSON.stringify(data);
  }
  $.ajax(request);
}
