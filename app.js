var map;
var service;
var gbfs = [];
var stations = [];
var stationsAddressLatLng = [];
var distanceArray = [];
var markers = [];

$(function() {
  // INITALIZE MAP
  function initialize(){
    var myLatLng = {lat: 40.748817, lng: -73.985428};
    var mapOption = {
      center: myLatLng,
      zoom: 12
    };
    map = new google.maps.Map(document.getElementById('map'), mapOption);
  }
  google.maps.event.addDomListener(window, 'load', initialize);


  var createMarker = function (info){
    var marker = new google.maps.Marker({
            position: new google.maps.LatLng(info.lat, info.lon),
            map: map,
            title: info.name
    });
    marker.content = "<div class='infoWindow'><p>Bike Capacity: " + info.capacity + "</p></div>";
    //Create information window for marker
    var infoWindow = new google.maps.InfoWindow();

    google.maps.event.addListener(marker, 'click', function(){
            infoWindow.setContent('<h2>' + marker.title + '</h2>' + marker.content);
            infoWindow.open(map, marker);
        });
    //scope markers to iterate in the view
    markers.push(marker);
  }

  var infoClick = function(e, selectedMarker) {
     e.preventDefault();
     google.maps.event.trigger(selectedMarker, 'click');
   }

  // GET GBFS DATA (NAME & URL) ASYNC FALSE BECAUSE NEED URL FROM THIS DATA FOR NEXT AJAX CALL
  $.ajax({
    method: 'GET',
    url: 'https://gbfs.citibikenyc.com/gbfs/gbfs.json',
    success: function callback(result) {
      for(var i = 0; i < result.data.en.feeds.length; i++)
        gbfs.push(result.data.en.feeds[i]);
    },
    async: false
  })
  // GET STATION INFO (FOR SOME REASON THE RETURN CHANGE WITH STATION STATUS SOMETIMES)
  $.ajax({
    method: 'GET',
    url: gbfs[0].url,
    success: function callback(result) {
      for (var i = 0; i < result.data.stations.length; i++){
        stations.push(result.data.stations[i]);
        stationsAddressLatLng[i] = new google.maps.LatLng(result.data.stations[i].lat, result.data.stations[i].lon);
        createMarker(result.data.stations[i]);

      }
    },
  })

  // HANDLE CLICK EVENT FOR SEARCH
  $(".find-bike").bind('submit', function(event) {
    event.preventDefault();
    event.stopPropagation();

    $('.bikes').empty();
    distanceArray.length = 0;

    var zipInput = $('#zipcode-input').val();

    var request = {
      query: zipInput
    };

    service = new google.maps.places.PlacesService(map);
    service.textSearch(request, callback);
    // GET THE LATITUDE AND LONGITUDE FROM THE ZIPCODE INPUTTED
    var inputLatLng;
    function callback(results, status){
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        var lat = results[0].geometry.location.lat();
        var lng = results[0].geometry.location.lng();
        inputLatLng = new google.maps.LatLng(lat,lng);
        for (var i = 0; i < stationsAddressLatLng.length; i++) {
          calRoute(inputLatLng, stationsAddressLatLng[i], i);
        }
      }
    }
  })

  function calRoute(start, end, index) {
    request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.WALKING
    }
    var directionsService = new google.maps.DirectionsService();

    directionsService.route(request, function (result, status) {
      // BFORE THE IF STATEMENT, GOT ALL 508 ITEMS
      if (status == google.maps.DirectionsStatus.OK) {
        // INSIDE IF STATEMENT, ONLY GOT THE LAST 10
        //SOLUTION UPGRADE TO PREMIUM TO FULLY USE DIRECTIONS SERVICE
        var distanceMiles = result.routes[0].legs[0].distance.value;
        var distanceText = result.routes[0].legs[0].distance.text;
        // DURATION WOULD WORK BETTER IF THE LOCATION OF THE USER IS EXACT, NOT JUST A ZIPCODE
        //var durationText = result.routes[0].legs[0].duration.text;
        //var durationValue = result.routes[0].legs[0].duration.value;
        distanceArray.push([parseInt(distanceMiles), distanceText, index]);
        //CHECK IF ALL ITEMS ARE THERE BEFORE DISPLAYING
        //if (distanceArray.length == stationsAddressLatLng.length)
        if(distanceArray.length == 10)
          displayBikes();
      }
    })
  }

  function displayBikes() {
    // SORTING NEAREST WITH DISTANCE VALUE
    distanceArray.sort(function(a,b){
      return a[0] - b[0];
    });
    var distances = [];
    var indexes = [];
    var distanceMiles = [];

    for (var i = 0; i < distanceArray.length; i++) {
      distances.push(distanceArray[i][0]);
      distanceMiles.push(distanceArray[i][1]);
      indexes.push(distanceArray[i][2]);
    }

    clearMarkers();

    var sevenStations = [];

    for (var i = 0; i < indexes.length; i++) {
      if(sevenStations.indexOf(stations[indexes[i]]) == -1 ){
        sevenStations.push(indexes[i]);
        $('.bikes').append('<li>' + stations[indexes[i]].name + 'is ' + distanceMiles[i] + ' away</>');
        markers[indexes[i]].setMap(map);
      }
      if(sevenStations.length == 7) break;
    }
  }

  function clearMarkers() {
        setAllMap(null);
    }

  function setAllMap(map) {
      for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(map);
      }
  }

})
