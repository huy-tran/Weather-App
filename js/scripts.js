jQuery(document).ready(function($) {
  var APIKey = 'f7e41e7408f1dccf47d870fc6103a8d5';
  var $loading = $('.sk-folding-cube');
  var $location = $('.location');
  var $weatherTemp = $('.weather-temp');
  var $weatherMain = $('.weather-main');
  var $weatherForecast = $('.weather-forecast');
  var $weatherUpdatedTemp;
  var $temp = $('.temp');
  var tempsArr = []; // Array to store forecast temperatures
  var currentTemp; // Temperature of current request API
  var countryName; // Display full country name rather than using Country Code

  // Check if browser supports Geolocation. Throwing warning if not.
  if (!navigator.geolocation) {
    $('.container').html("<h1 class='no-geo'>Geolocation is not supported by your browser</h1>");
    return false;
  }

  $loading.show(); // Display loading state when the page is loading

  // Get User IP using ipify
  var getUserIP = $.getJSON("https://api.ipify.org?format=jsonp&callback=?");

  // When getUserIP is success, execute getGeolocation
  getUserIP.done(function(data) {
    var userIP = data.ip;
    getGeolocation(userIP);
  });

  /**
   * [Get geolocation using API from freegeoip. Make request to weather API when successful]
   * @param  {string} ip [user ip address]
   * @return {null}
   */
  function getGeolocation(ip) {
    var urlRequest = 'http://freegeoip.net/json/' + ip;
    $.getJSON(urlRequest)
      .done(function(response) {
        var lat = response.latitude;
        var lng = response.longitude;
        countryName = response.country_name;
        // API url
        var forecastUrl = "http://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lng + "&appid=" + APIKey;
        var currentUrl = "http://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lng + "&appid=" + APIKey;
        // Make async request
        var currentPromise = currentRequest(currentUrl);
        var forecastPromise = forecastRequest(forecastUrl);

        currentPromise.done(function(data){
          currentSuccess(data);
        });
        forecastPromise.done(function(data){
          forecastSuccess(data);
        });
      })
      .fail(function() {
        $location.html("<h2>Unable to retrieve your location</h2>");
      });
  }

  // Initialise deferred object
  var forecastDeferred = $.Deferred();
  var currentDeferred = $.Deferred();

  /**
   *  [Make request to forecast API]
   *  @method forecastRequest
   *  @param  {[string]} url [api url]
   *  @return {[object]} [promise object to resolve forecastDeferred]
   */
  function forecastRequest(url) {
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'JSON',
      success: function(data) {
        forecastDeferred.resolve(data);
      },
      error: function() {
        tempsArr = false; // Flag forecast result as false
        $weatherForecast.append("<h2 class='warning'>Our forecast satellites are fighting with the alien !!!</h2>"); // Display nice warning
      }
    });
    return forecastDeferred.promise();
  }

  /**
   *  [Make request to current API]
   *  @method currentRequest
   *  @param  {string} url [api url]
   *  @return {object} [promise object to resolve currentDeferred]
   */
  function currentRequest(url) {
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'JSON',
      success: function(data) {
        $loading.fadeOut('fast');
        currentDeferred.resolve(data);
      },
      error: function(data) {
				$loading.fadeOut('slow'); // Hide loading state
        $('.weather-display').html("<h2 class='warning'>Our local satellites are fighting with the alien !!!</h2>"); // Display nice warning
      }
    });
    return currentDeferred.promise();
  }

  /**
   *  [Display result getting from currentRequest]
   *  @method currentSuccess
   *  @param  {object} data [request result]
   *  @return {null}
   */
  function currentSuccess(data) {
    var locationCity = data.name;
    var locationCountry = countryName;
    var temp = data.main.temp;
    var condition = data.weather[0].main;
    var description = data.weather[0].description;

    var tempCelcius = convertCelcius(temp);

    // Display Location name
    var locationName = locationCity + ", " + locationCountry;
    $location.html('<h2>' + locationName+ '</h2>');
    $location.children('h2').fadeIn('slow');

    // Display Current Temperature
    var tempDisplay = $("<h2 class='temp'>" + tempCelcius + " &#8451;</h2>").hide();
    $weatherTemp.prepend(tempDisplay);
    tempDisplay.delay(500)
               .fadeIn('slow', function(){ // After display temp, show temp toggle
                 $('.temp-toggle').fadeIn('slow');
               });

    // Display weather icon
    $weatherMain.find('img').attr('src', getIcon(condition));
    //Display description
    var desc = $("<p>" + description + "</p>").hide();
    $weatherMain.append(desc);
    desc.delay(500).fadeIn('slow');

    currentTemp = $weatherTemp.find('h2').text().split(' ')[0];
  }

  /**
   *  [Display result getting from forecastRequest]
   *  @method forecastSuccess
   *  @param  {object} data [request result]
   *  @return {null}
   */
  function forecastSuccess(data) {
    var weatherList = data.list;
    if (!weatherList[0]) {
      return false;
    }
    var currentDT = weatherList[0].dt_txt.split(' ')[0]; // Retrieve format year-month-date for filtering

    // Display Weather Forecast
    var forecasts = weatherList.filter(function(list) {
      return list.dt_txt.match(currentDT);
    });

    var frag = ''; //Concat HTML for best practice
    forecasts.splice(0, 1); // Remove the current weather out of list
    forecasts.forEach(function(item){
      var time = item.dt_txt.split(' ')[1].match(/\d{2}:\d{2}/);
      var icon = getIcon(item.weather[0].main);
      var desc = item.weather[0].description;
      var temp = convertCelcius(item.main.temp);
      frag += "<div class='col-md-4 forecast-item'><div class='col-md-4'>" +
              "<h3>" + time + "</h3>" +
              "<img src='" + icon + "'>" +
              "<p>" + desc + "</p></div>" + "<div class='col-md-8 weather-temp'>" +
              "<h2 class='temp'>" + temp + " &#8451;</h2></div></div>";
    });
    $weatherForecast.append(frag);
    // As a result of appeding new HTML
    // Update jQuery DOM element for toggle button purpose
    $weatherUpdatedTemp = $('.weather-temp');
    tempsArr = $weatherUpdatedTemp.find('h2').text().replace(/\s\D/g, ' ').split(' ').slice(0, -1); // Get rid of C, F symbol to make a plain number array
  }

  // Temp Toggle
  $('#temp-toggle').on('click', function(){
    var isCelcius = $(this).prop('checked'); // Check if toggle is active

    if (!tempsArr || tempsArr === undefined) {
      if (isCelcius) {
        // Toggle to Fahrenheit format
        $weatherTemp.find('h2').html("<h2 class='temp'>" + convertFahrenheit(currentTemp) + " &#8457;</h2>");
      } else {
        // Toggle to Celcius format
        $weatherTemp.find('h2').html("<h2 class='temp'>" + currentTemp + " &#8451;</h2>");
      }
    } else {
      var length = tempsArr.length;
      if (isCelcius) {
        // Convert to Fahrenheit
        var convertedTemps = []; // Not mutate tempsArr purpose
        tempsArr.forEach(function(temp){
          convertedTemps.push(convertFahrenheit(temp));
        });

        for (var i = 0; i < length; i++) {
          $($weatherUpdatedTemp[i]).find('h2').html("<h2 class='temp'>" + convertedTemps[i] + " &#8457;</h2>");
        }
      } else {
        for (var j = 0; j < length; j++) {
          $($weatherUpdatedTemp[j]).find('h2').html("<h2 class='temp'>" + tempsArr[j] + " &#8451;</h2>");
        }
      }
    }
  });

  /**
   *  [Convert temperature from Kelvin to Celcius]
   *  @method convertCelcius
   *  @param  {number} tempK [default format from API]
   *  @return {number} [Celcius format]
   */
  function convertCelcius(tempK) {
    return Math.round(tempK - 273.15);
  }

  /**
   *  [Convert temperature from Celcius to Fahrenheit]
   *  @method convertFahrenheit
   *  @param  {number} tempC [Celcius format]
   *  @return {number} [Fahrenheit format]
   */
  function convertFahrenheit(tempC) {
    return Math.round(tempC * 9 / 5 + 32);
  }

  /**
   *  [Get icon based on condition from API]
   *  @method getIcon
   *  @param  {string} condition [result from API]
   *  @return {string} [image url]
   */
  function getIcon(condition) {
    return 'images/' + condition.toLowerCase() + '.png';
  }
});
