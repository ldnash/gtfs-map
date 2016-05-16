function LoadCSV(url) {
		var deferred = $.ajax({
		type:     "GET",
		url:      url,
		dataType: "text",
		error: function () {
			console.log("Error loading CSV", url);
		}
	});
	return deferred;
}

function LoadCuva(map) {
	var deferredStop = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/stops.txt");
	var deferredTime = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/stop_times.txt");
	
	//http://leafletjs.com/reference.html#icon
	var myIcon = L.icon({
		iconUrl: 'https://raw.githubusercontent.com/nationalparkservice/npmap-symbol-library/gh-pages/renders/standalone/bus-stop-black-32.png',
		iconSize: [32, 32],
		iconAnchor: [16, 0],
		popupAnchor: [0, 0]
	});
	
	$.when(deferredStop, deferredTime).then(function(stopCsv, timesCsv) {
		// Convert the csv data into arrays of objects using jquery-csv
		var stopData = $.csv.toObjects(stopCsv[0]);
		var timeData = $.csv.toObjects(timesCsv[0]);
	
		// Create our markers with popups
		stopData.forEach(function (stop) {
			var marker = L.marker([stop.stop_lat, stop.stop_lon], {icon: myIcon}).addTo(map);
			var releventTimes = timeData.filter(function (time) {
				return stop.stop_id === time.stop_id;
			});
			var popupStr = "<h1>" + stop.stop_name + "</h1><br>";
			releventTimes.forEach(function(time) {
				popupStr = popupStr + "<b>Arrival:</b> " + time.arrival_time + " <b>Departure:</b> " + time.departure_time + "<br>";
			});
			
			marker.bindPopup(popupStr);
		});
	});
}
