var ShowRouteByDefault = true;

// Global object to hold references to each polyline
var PolylinesById = new Object();

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

// Keep track of whether or not we created a legend already
// This allows us to load multiple GTFS feeds without multiple legends/date selectors
var legendCreated = false;

// Load the Rocky Mountain GTFS
function LoadRomo(map) {
	var deferredStop     = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/stops.txt");
	var deferredTime     = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/stop_times.txt");
	var deferredTrips    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/trips.txt");
	var deferredShapes   = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/shapes.txt");
	var deferredRoute    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/routes.txt");
	var deferredCalender = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/calendar.txt");
	var deferredDates    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/romo/shuttles/calendar_dates.txt");
	
	LoadGTFS(map, deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates);
}

// Load the Cuyahoga Valley GTFS
function LoadCuva(map) {
	var deferredStop     = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/stops.txt");
	var deferredTime     = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/stop_times.txt");
	var deferredTrips    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/trips.txt");
	var deferredShapes   = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/shapes.txt");
	var deferredRoute    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/routes.txt");
	var deferredCalender = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/calendar.txt");
	var deferredDates    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/cuva/scenic-rail/calendar_dates.txt");
	
	LoadGTFS(map, deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates);
}

// Load the Boston Harbor Islands GTFS
function LoadBoha(map) {
	var deferredStop     = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/stops.txt");
	var deferredTime     = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/stop_times.txt");
	var deferredTrips    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/trips.txt");
	var deferredShapes   = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/shapes.txt");
	var deferredRoute    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/routes.txt");
	var deferredCalender = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/calendar.txt");
	var deferredDates    = LoadCSV("https://raw.githubusercontent.com/nationalparkservice/nps-gtfs/gh-pages/boha/ferries/calendar_dates.txt");
	
	LoadGTFS(map, deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates);
}

function LoadEstes(map) {
	var deferredStop     = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/stops.txt");
	var deferredTime     = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/stop_times.txt");
	var deferredTrips    = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/trips.txt");
	var deferredShapes   = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/shapes.txt");
	var deferredRoute    = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/routes.txt");
	var deferredCalender = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/calendar.txt");
	var deferredDates    = LoadCSV("https://raw.githubusercontent.com/ldnash/gtfs-map/gh-pages/EstesFeed/calendar_dates.txt");
	
	LoadGTFS(map, deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates);
}
	
	
// Given deferred objects to return the indicated CSV files, populates the map
function LoadGTFS(map,deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates) {
	
	// Determine if we should show all routes on load, or only when one is selected
	var showRouteInput = getParameterByName('showRoutesByDefault');
	if (showRouteInput) {
		console.log("input", showRouteInput);
		ShowRouteByDefault = stringToBoolean(showRouteInput);
	}
	
	$.when(deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates).then(function(stopCsv, timesCsv, tripCsv, shapeCsv, routeCsv, calenderCsv, datesCsv) {
		// Convert the csv data into arrays of objects using jquery-csv
		var stopData     = $.csv.toObjects(stopCsv[0]);
		var timeData     = $.csv.toObjects(timesCsv[0]);
		var tripData     = $.csv.toObjects(tripCsv[0]);
		var shapeData    = $.csv.toObjects(shapeCsv[0]);
		var routeData    = $.csv.toObjects(routeCsv[0]);
		var calenderData = $.csv.toObjects(calenderCsv[0]);
		var datesData    = $.csv.toObjects(datesCsv[0]);
		
		var myIcon = selectIcon(routeData[0].route_type);
		
		// Create dictionaries to allow quick lookup by ID
		var sortedShapes = groupBy(shapeData, 'shape_id');
		var sortedTrips  = groupBy(tripData, 'route_id');
		var tripById     = groupBy(tripData, 'trip_id');
		var routeById    = groupBy(routeData, 'route_id');
		
		var lineColor = "#d39800";
		
		// Draw shapes (polylines) for each route
		for(var routeId in sortedTrips) {
			var trips = sortedTrips[routeId];
			var routeInfo;
			for(var i = 0; i < routeData.length; i++) {
				if (routeData[i].route_id === routeId) { routeInfo = routeData[i]; break; }
			}
			// Set line color to the default
			
			// Use styling data from route instead, if it exists
			if (routeInfo.route_color) {
				lineColor = "#" + routeInfo.route_color;
			}
			//Get all shapes to draw for this route
			var flags = [], shapes = [], l = trips.length, i;
			for( i=0; i<l; i++) {
				if(flags[trips[i].shape_id]) continue;
				flags[trips[i].shape_id] = true;
				shapes.push(trips[i].shape_id);
			}
			
			var toDraw = [];
			// Draw each shape for this route
			shapes.forEach(function(shapeId) {
				var latLngs = [];
				var shape = sortedShapes[shapeId];
				shape.forEach(function (point) {
					latLngs.push(L.latLng(point.shape_pt_lat, point.shape_pt_lon));
				});
				toDraw.push(latLngs);
			});
			var routeLine = L.multiPolyline(toDraw, {color: lineColor});
			PolylinesById[routeId] = routeLine;
			if (ShowRouteByDefault) {
				map.addLayer(routeLine);
			}
		}
		
		// Find the services we should display arrival times for
		var dateArgument = getParameterByName('date');
		var date;
		if (dateArgument) {
			date = parseDate(dateArgument);
		} else {
			date = new Date();
		}
		var dateStr = date.yyyymmdd();
		var runningServices = [];
		calenderData.forEach(function(service) {
			if (parseDate(service.start_date) <= date && parseDate(service.end_date) >= date) {
				if (service[getDayString(date.getDay())] === '1') {
					runningServices.push(service.service_id);
				}
			}
		});
		
		// Check for exceptions
		datesData.forEach(function(calenderDate) {
			if (calenderDate.date === dateStr) {
				if (calenderDate.exception_type === '1') {
					runningServices.push(calenderDate.service_id);
				} else {
					var i = runningServices.length;
					while (i--) {
						if (runningServices[i] === calenderDate.service_id) {
							runningServices.splice(i, 1);
							break;
						}
					}
				}
			}
		});
		
		// Create our markers with popups
		stopData.forEach(function (stop) {
			var marker = L.marker([stop.stop_lat, stop.stop_lon], {icon: myIcon}).addTo(map);
			// Get only the times for this stop
			var releventTimes = timeData.filter(function (time) {
				return stop.stop_id === time.stop_id;
			});
			
			var timesByRoute = new Object();
			releventTimes.forEach(function(time) {
				// Get the trip; trip_id is unique in the dataset, so we can just get the one at index 0
				var trip = tripById[time.trip_id][0];
				if (contains(runningServices, trip.service_id)) {
					if (!timesByRoute[trip.route_id]) {timesByRoute[trip.route_id] = [];}
					timesByRoute[trip.route_id].push(time);
				}
			});
			
			// Sort the time listings
			for(var routeId in timesByRoute) {
				timesByRoute[routeId].sort(function (a, b) {
					return new Date('1970/01/01 ' + a.departure_time) - new Date('1970/01/01 ' + b.departure_time);
				});
			}
			
			var optionsString = "";
			var notEmpty = false;
			for (var routeId in timesByRoute) {
				notEmpty = true;
				optionsString = optionsString + "<option value = \"" + routeId + "\">" + routeById[routeId][0].route_long_name + "</option>";
			}

			var popupStr = "<h1>" + stop.stop_name + "</h1><br>";
			if (!notEmpty) {
				popupStr += "No departures scheduled for this stop";
			} else {
				popupStr += "<select class='select-popup' id='selector' > <option value=\"\">Select a Route</option>" + optionsString;
				popupStr += "</select><br><br>";
			}
			routeData.forEach(function(route) {	
				if (timesByRoute[route.route_id]) {
					popupStr += "<div id = \"" + route.route_id + "div\" style = \"display : none\">"
					popupStr += "<b>Scheduled Departures</b><br><br>";
					var direction0String = "";
					var headsign0 = "Outbound";
					var direction1String = "";
					var headsign1 = "Inbound";
					timesByRoute[route.route_id].forEach(function(time) {
						var trip = tripById[time.trip_id][0];
						if (trip.direction_id === '1') {
							direction1String += "<li>" + parseTime(time.departure_time) + "</li>";
							if (!trip.trip_headsign == "") {
								headsign1 = trip.trip_headsign;
							}
						} else {
							direction0String += "<li>" + parseTime(time.departure_time) + "</li>";
							if (!trip.trip_headsign == "") {
								headsign0 = trip.trip_headsign;
							}
						}
					});
					var table = "<table><tr width : 250px>";
					var tableR1 = "<tr width : 250px>";
					var tableR2 = "<tr width : 250px>";
					if (direction0String != "") {
						tableR1 += "<td width : 125px><b>" + headsign0 + "</b></td>";
						tableR2 += "<td width : 125px><ul>" + direction0String + "</ul></td>";
					}
					if (direction1String != "") {
						tableR1 += "<td width : 125px><b>" + headsign1 + "</b></td>";
						tableR2 += "<td width : 125px><ul>" + direction1String + "</ul></td>";
					}
					table += tableR1 + "</tr>" + tableR2 + "</tr></table>";
					popupStr += table + "</div>";
				}
			});
			marker.bindPopup(popupStr);
		});
		
		
		
		if (!legendCreated) {
			legendCreated = true;
			var legend = L.control({position: 'topright' });
			legend.onAdd = function (map) {
				var div = L.DomUtil.create('div', 'info legend');
				$(div).attr('style', 'background : #f9f7f1; padding: 5px;');
				$(div).attr('id', 'legendContainer');
				div.innerHTML += '<table><tr>' + '<td><img src="' + myIcon.options.iconUrl + 
					'" height="32px" width="32px" alt="Transit Stop Icon"/></td>' + '<td><p style="{float: right}">Transit Stop</p></td></tr>' 
					+ '<tr><td><hr style="border-style: solid; border-width: 2px; border-color :' + lineColor + ';"></td><td><p>Route<\p></td>' + '</tr></table>';
				return div;
			}
			legend.addTo(map);
			
			var dateSelect = L.control({position: 'bottomright'});
			dateSelect.onAdd = function (map) {
				var div = L.DomUtil.create('div', 'dpick');
				$(div).attr('style', 'background : #f9f7f1; padding: 5px;');
				div.innerHTML += '<p>Select a Date</p><input type="text" id="datepicker"><br><button type="button" style="margin-top: 5px;" id="showschedule">Show Schedule</button>';
				return div;
			}
		
			dateSelect.addTo(map);
			$('#datepicker').datepicker().datepicker('setDate', date);
		
			$('#showschedule').click(function(event) {
				var dateToShow = $('#datepicker').datepicker("getDate");
				var parkId = getParameterByName('parkId');
				var url = getPathFromUrl(window.location.href);
				url += '?';
				if (parkId && parkId != "")
					url += 'parkId=' + parkId + '&'
				url += 'date=' + dateToShow.yyyymmdd();
				window.location.href = url;
			});
		}
	});
	
	// Pan to popups when they open, and bind js to the dropdown
	map.on('popupopen', function(e) {
			var dropdown = $('select.select-popup');
			dropdown.change(function() {
				var select = dropdown[0];
				var selected = select.options[select.selectedIndex].value;
				var toShow = $('#' + selected + 'div');
				// Hide all other divs
				for (var i=0;i<select.options.length;i++) {
					
					var toHide = $('#' + select.options[i].value + 'div');
					if (toHide) {
						toHide.attr('style', 'display : none');
					}
				}
				// Show the div we are supposed to
				if (toShow) {
					toShow.attr('style', '');
				}
				
				// Hide/show routes if necessary
				//if (!ShowRouteByDefault || stringToBoolean(highlight)) {
					for (var routeId in PolylinesById) {
						map.removeLayer(PolylinesById[routeId]);
					}
					map.addLayer(PolylinesById[selected]);
				//}
			});
			// Pan to popup
			var px = map.project(e.popup._latlng); // find the pixel location on the map where the popup anchor is
			px.y -= e.popup._container.clientHeight/2; // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
			map.panTo(map.unproject(px),{animate: true}); // pan to new center
		});
		
	map.on('popupclose', function (e) {
		if (!ShowRouteByDefault) {
			for (var routeId in PolylinesById) {
				map.removeLayer(PolylinesById[routeId]);
			}
		} else {
			for (var routeId in PolylinesById) {
				map.addLayer(PolylinesById[routeId]);
			}
		}
	});
}

// Icons for each type of transportation

//var streetcarIcon;
//var subwayIcon;
var railIcon = L.icon({
		iconUrl: '../Images/rail.svg',
		iconSize: [32, 32],
		iconAnchor: [16, 0],
		popupAnchor: [0, 0]
	});
	
var busIcon = L.icon({
		iconUrl: 'https://raw.githubusercontent.com/nationalparkservice/npmap-symbol-library/gh-pages/renders/standalone/bus-stop-black-32.png',
		iconSize: [32, 32],
		iconAnchor: [16, 0],
		popupAnchor: [0, 0]
	});
	
var ferryIcon = L.icon({
		iconUrl: 'https://raw.githubusercontent.com/nationalparkservice/npmap-symbol-library/gh-pages/renders/standalone/boat-tour-black-32.png',
		iconSize: [32, 32],
		iconAnchor: [16, 0],
		popupAnchor: [0, 0]
	});
	
var defaultIcon = L.icon({
		iconUrl: 'https://raw.githubusercontent.com/nationalparkservice/npmap-symbol-library/gh-pages/renders/standalone/bus-stop-black-32.png',
		iconSize: [32, 32],
		iconAnchor: [16, 0],
		popupAnchor: [0, 0]
	});
//var cablecarIcon;
//var gondolaIcon;
//var finicularIcon;

function selectIcon(routeType) {
	if (routeType) {
		if (routeType === '2')
			return railIcon;
		if (routeType === '3')
			return busIcon;
		if (routeType === '4')
			return ferryIcon;
	}
	return defaultIcon;
}

// Helper functions
 function parseDate(str) {
    if(!/^(\d){8}$/.test(str)) return "invalid date";
    var y = str.substr(0,4),
        m = str.substr(4,2) - 1,
        d = str.substr(6,2);
    return new Date(y,m,d);
}

Date.prototype.yyyymmdd = function() {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
   var dd  = this.getDate().toString();
   return yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]); // padding
};
  
  
 function parseTime(timeStr) {
	var time = timeStr.split(":");
	var suffix = "A.M.";
	var hours = parseInt(time[0]);
	if (hours > 12) { hours = hours - 12; suffix = "P.M.";}
	if (hours == 0) {hours = 12;}
	return hours.toString() + ":" + time[1] + " " + suffix;
 }

  
 function getDayString(dayInt) {
	switch(dayInt) {
		case 0:
			return "sunday";
		case 1:
			return "monday";
		case 2:
			return "tuesday";
		case 3:
			return "wednesday";
		case 4:
			return "thursday";
		case 5:
			return "friday";
		case 6:
			return "saturday";
	}
 }
 
 function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}
  
function groupBy(arr, property) {
  return arr.reduce(function(memo, x) {
    if (!memo[x[property]]) { memo[x[property]] = []; }
    memo[x[property]].push(x);
    return memo;
  }, {});
}

function getPathFromUrl(url) {
  return url.split("?")[0];
}

function stringToBoolean(string){
    switch(string.toLowerCase().trim()){
        case "true": case "yes": case "1": return true;
        case "false": case "no": case "0": case null: return false;
        default: return Boolean(string);
    }
}
