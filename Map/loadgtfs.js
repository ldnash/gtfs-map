var ShowRouteByDefault = true;

// Global object to hold references to each polyline
var PolylinesByShapeId = new Object();
// Dictionary to hold trips by stop Id, used for hiding polylines
var TripsByStop = new Object();

// Distance (in pixels) at which markers are clustered. Higher number = more clustering
// THIS MUST BE > 0
var clusterRadius = 80;

// Dictionary to hold route colors
var colorByRoute = new Object();

var colorIcons = false;

function LoadCSV(url) {
    var deferred = $.ajax({
        type: "GET",
        url: url,
        dataType: "text",
        error: function() {
            console.log("Error loading CSV", url);
        }
    });
    return deferred;
}

// Keep track of whether or not we created a legend already
// This allows us to load multiple GTFS feeds without multiple legends/date selectors
var legendCreated = false;

// Array of stop IDs to be highlighted as 'hubs'
// Add stop IDs to this array to replace the regular marker with a red version
var hubs = [];

// Load the given GTFS feed
function LoadGTFSFeed(map, stopsFile, timesFile, tripsFile, shapesFile, routesFile, calendarFile, calDatesFile, freqFile, clusterDistance, shouldColorStops) {
	console.log("start");
    var deferredStop = LoadCSV(stopsFile);
    var deferredTime = LoadCSV(timesFile);
    var deferredTrips = LoadCSV(tripsFile);
    var deferredShapes = LoadCSV(shapesFile);
    var deferredRoute = LoadCSV(routesFile);
    var deferredCalender = LoadCSV(calendarFile);
    var deferredDates = LoadCSV(calDatesFile);
	if (freqFile)
		var deferredFreq = LoadCSV(freqFile);
	else
		var deferredFreq = null;
	console.log("got here");
    if (clusterDistance) {
        if (clusterDistance <= 0)
            clusterRadius = 1;
        else
            clusterRadius = clusterDistance;
	}
	
    colorIcons = shouldColorStops;

    LoadGTFS(map, deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates, deferredFreq);
}


// Given deferred objects to return the indicated CSV files, populates the map
function LoadGTFS(map, deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates, deferredFreq) {
	console.log("here");

    $.when(deferredStop, deferredTime, deferredTrips, deferredShapes, deferredRoute, deferredCalender, deferredDates, deferredFreq).then(function(stopCsv, timesCsv, tripCsv, shapeCsv, routeCsv, calenderCsv, datesCsv, freqCsv) {
        // Convert the csv data into arrays of objects using jquery-csv
        var stopData = $.csv.toObjects(stopCsv[0]);
        var timeData = $.csv.toObjects(timesCsv[0]);
        var tripData = $.csv.toObjects(tripCsv[0]);
        var shapeData = $.csv.toObjects(shapeCsv[0]);
        var routeData = $.csv.toObjects(routeCsv[0]);
        var calenderData = $.csv.toObjects(calenderCsv[0]);
        var datesData = $.csv.toObjects(datesCsv[0]);

        var freqData;
        var freqByTrip;
        if (freqCsv != null) {
            freqData = $.csv.toObjects(freqCsv[0]);
            freqByTrip = groupBy(freqData, 'trip_id');
        }

        // Create dictionaries to allow quick lookup by ID
        var sortedShapes = groupBy(shapeData, 'shape_id');
        var sortedTrips = groupBy(tripData, 'route_id');
        var tripById = groupBy(tripData, 'trip_id');
        var routeById = groupBy(routeData, 'route_id');

        // Sort stops by parent_id, so we can cluster them into one marker
        var stopsByParent = groupBy(stopData, 'parent_station');

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

        // Draw all shapes (polylines) for each route
        for (var routeId in sortedTrips) {
            var trips = sortedTrips[routeId];
            var routeInfo;
            // Set line color to the default
            var lineColor = "#d39800";
            for (var i = 0; i < routeData.length; i++) {
                if (routeData[i].route_id === routeId) {
                    routeInfo = routeData[i];
                    break;
                }
            }

            // Use styling data from route instead, if it exists
            if (routeInfo.route_color) {
                lineColor = "#" + routeInfo.route_color;
            }

            colorByRoute[routeId] = lineColor;
            //Get all shapes to draw for this route
            var flags = [],
                shapes = [],
                l = trips.length,
                i;
            for (i = 0; i < l; i++) {
                if (flags[trips[i].shape_id] || !contains(runningServices, trips[i].service_id)) continue;
                flags[trips[i].shape_id] = true;
                shapes.push(trips[i].shape_id);
            }

            var toDraw = [];
            // Draw each shape for this route
            shapes.forEach(function(shapeId) {
                var latLngs = [];
                var shape = sortedShapes[shapeId];
                shape.forEach(function(point) {
                    latLngs.push(L.latLng(point.shape_pt_lat, point.shape_pt_lon));
                });
                var routeLine = L.polyline(latLngs, {
                    color: lineColor
                });
                PolylinesByShapeId[shapeId] = routeLine;
                map.addLayer(routeLine);
            });
        }



        var hubStops = stopData.filter(function(stop) {
            return contains(hubs, stop.stop_id);
        });

        var normalStops = stopData.filter(function(stop) {
            return !contains(hubs, stop.stop_id);
        });

        addStopMarkers(map, normalStops, stopsByParent, timeData, tripById, runningServices, routeById, routeData, freqByTrip);

        addStopMarkers(map, hubStops, stopsByParent, timeData, tripById, runningServices, routeById, routeData, freqByTrip);

        // See if we have already created a legend/datepicker.  If not, do it.
        if (!legendCreated) {
            legendCreated = true;
            var legend = L.control({
                position: 'topright'
            });
            legend.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'info legend');
                $(div).attr('style', 'background : #f9f7f1; padding: 5px;');
                $(div).attr('id', 'legendContainer');
                div.innerHTML += '<table><tr>' + '<td style="padding:10px"><img src="legendmarker.png"' + 
                    '" alt="Transit Stop Icon"/></td>' + '<td><p style="{float: right}">Transit Stop</p></td></tr>' +
                    '<tr><td style="padding:10px"><hr style="border-style: solid; border-width: 2px; border-color :' + lineColor + ';"></td><td><p>Route<\p></td>' + '</tr></table>';
                return div;
            }
            legend.addTo(map);

            var dateSelect = L.control({
                position: 'bottomright'
            });
            dateSelect.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'dpick');
                $(div).attr('style', 'background : #f9f7f1; padding: 5px;');
                div.innerHTML += '<p>Select a Date</p><input type="text" id="datepicker">';
                return div;
            }

            dateSelect.addTo(map);
            $('#datepicker').datepicker({
                onSelect: function(date) {
                    var dateToShow = $('#datepicker').datepicker("getDate");
                    var parkId = getParameterByName('parkId');
                    var url = getPathFromUrl(window.location.href);
                    url += '?';
                    if (parkId && parkId != "")
                        url += 'parkId=' + parkId + '&'
                    url += 'date=' + dateToShow.yyyymmdd();
                    window.location.href = url;
                },
            }).datepicker('setDate', date);
        }
    });

    // Pan to popups when they open, and bind js to the dropdown
    map.on('popupopen', function(e) {
        var dropdown = $('select.select-popup');
        var stopId = $('#stopId');
        var stopTrips = TripsByStop[stopId[0].value];
        if (dropdown[0]) {
            dropdown.change(function() {
                var select = dropdown[0];
                var selected = select.options[select.selectedIndex].value;
                var toShow = $('#' + selected + 'div');
                var colorIndicator = $('#routeColorIndicator');
                var tripsForRoute = [];
                // Filter to get only trips for selected route
                stopTrips.forEach(function(trip) {
                    if (trip.route_id == selected)
                        tripsForRoute.push(trip);
                });
                // Hide all other divs
                for (var i = 0; i < select.options.length; i++) {

                    var toHide = $('#' + select.options[i].value + 'div');
                    if (toHide) {
                        toHide.attr('style', 'display : none');
                    }
                }
                // Show the div we are supposed to
                if (toShow) {
                    toShow.attr('style', '');
                    colorIndicator.attr('style', 'background: ' + colorByRoute[selected]);
                }

                if (selected == "")
                    colorIndicator.attr('style', 'display : none');

                // Hide/show
                for (var shapeId in PolylinesByShapeId) {
                    map.removeLayer(PolylinesByShapeId[shapeId]);
                }
                tripsForRoute.forEach(function(trip) {
                    map.addLayer(PolylinesByShapeId[trip.shape_id]);
                });
            });
        } else {
            var hiddenValue = $('#hiddenId').val();
            var tripsForRoute = [];
            // Filter to get only trips for selected route
            stopTrips.forEach(function(trip) {
                if (trip.route_id == hiddenValue)
                    tripsForRoute.push(trip);
            });
            for (var shapeId in PolylinesByShapeId) {
                map.removeLayer(PolylinesByShapeId[shapeId]);
            }
            tripsForRoute.forEach(function(trip) {
                map.addLayer(PolylinesByShapeId[trip.shape_id]);
            });
        }
        // Pan to popup; this doesn't work if we load multiple feeds
        var px = map.project(e.popup._latlng); // find the pixel location on the map where the popup anchor is
        px.y -= e.popup._container.clientHeight / 2; // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
        map.panTo(map.unproject(px), {
            animate: true
        }); // pan to new center
    });

    // When popup closes, add all shapes back to the map
    map.on('popupclose', function(e) {
        for (var shapeId in PolylinesByShapeId) {
            map.addLayer(PolylinesByShapeId[shapeId]);
        }
    });
}

// Adds all stops in stopData to the map, and builds a popup for each stop.
function addStopMarkers(map, stopData, stopsByParent, timeData, tripById, runningServices, routeById, routeData, freqByTrip) {
    // Create our markers with popups
    var markerLayer = L.markerClusterGroup({
        maxClusterRadius: clusterRadius,
    });

    if (getParameterByName('colorIcons'))
        colorIcons = getParameterByName('colorIcons');


    stopData.forEach(function(stop) {

        TripsByStop[stop.stop_id] = [];
        // If a stop has a parent, we will show its times under the station
        if (stop.parent_station == "" || !stop.parent_station) {
            var marker;
            var geojson = {
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [stop.stop_lon, stop.stop_lat]
                    },
                    "properties": {}
                }]
            };
            if (contains(hubs, stop.stop_id))
                var style = {
                    point: {
                        'marker-color': '#000000',
                        'marker-size': 'large',
                        'marker-symbol': pickMarkerIcon(routeData[0].route_type)
                    }
                };
            else
                var style = {
                    point: {
                        'marker-color': '#000000',
                        'marker-size': 'medium',
                        'marker-symbol': pickMarkerIcon(routeData[0].route_type)
                    }
                };
            // Get only the times for this stop
            var releventTimes = [];
            // If this stop is a station, get the times for its children as well
            if (stop.location_type == '1') {
                var childStops = stopsByParent[stop.stop_id];
                childStops.forEach(function(childStop) {
                    releventTimes = releventTimes.concat(timeData.filter(function(time) {
                        return childStop.stop_id === time.stop_id && time.pickup_type != '1';
                    }));
                });
            }
            releventTimes = releventTimes.concat(timeData.filter(function(time) {
                return stop.stop_id === time.stop_id && time.pickup_type != '1';
            }));

            var timesByRoute = new Object();
            releventTimes.forEach(function(time) {
                // Get the trip; trip_id is unique in the dataset, so we can just get the one at index 0
                var trip = tripById[time.trip_id][0];
                TripsByStop[stop.stop_id].push(trip);
                if (contains(runningServices, trip.service_id)) {
                    if (!timesByRoute[trip.route_id]) {
                        timesByRoute[trip.route_id] = [];
                    }
                    timesByRoute[trip.route_id].push(time);
                }
            });

            // Sort the time listings
            for (var routeId in timesByRoute) {
                timesByRoute[routeId].sort(function(a, b) {
                    return new Date('1970/01/01 ' + a.departure_time) - new Date('1970/01/01 ' + b.departure_time);
                });
            }

            // If a stop has only one route, we don't want to show a dropdown
            var singleRoute = (1 == Object.keys(timesByRoute).length);
            var optionsString = "";
            var popupStr = "<h1>" + stop.stop_name + "</h1> <input type='hidden' id='stopId' value=" + stop.stop_id + "><br>";
            var notEmpty = false;

            if (!singleRoute) {
                for (var routeId in timesByRoute) {
                    notEmpty = true;
                    optionsString = optionsString + "<option value = \"" + routeId + "\">" + routeById[routeId][0].route_long_name + "</option>";
                }
            } else {
                // If there is only one route, don't bother with a dropdown.  We also add a hidden field with routeId so we can hide other routes when this popup opens
                popupStr += "<div id='routeColorIndicator' class='colorbox' style='background: " + colorByRoute[Object.keys(timesByRoute)[0]] + ";'></div><p>Route: " + routeById[Object.keys(timesByRoute)[0]][0].route_long_name + "</p><input type='hidden' id='hiddenId' value='" + routeId + "'/><br>";
                // If this isn't a hub, and we were given the argument, 
                if (!contains(hubs, stop.stop_id) && colorIcons) {
                    style.point['marker-color'] = colorByRoute[Object.keys(timesByRoute)[0]];
                }
            }
            if (!notEmpty && !singleRoute) {
                return;
            } else if (!singleRoute) {
                popupStr += "<div id='routeColorIndicator' class='colorbox' style='display:none'></div><select class='select-popup' id='selector' > <option value=\"\">Select a Route</option>" + optionsString;
                popupStr += "</select><br><br>";
            }
            routeData.forEach(function(route) {
                var freqTripsShown = new Object();
                if (timesByRoute[route.route_id]) {
                    // Only hide if we have multiple routes
                    if (!singleRoute) {
                        popupStr += "<div id = \"" + route.route_id + "div\" style = \"display : none\">"
                    } else {
                        popupStr += "<div id = \"" + route.route_id + "div\">"
                    }
                    popupStr += "<b>Scheduled Departures</b><br><br>";
                    var direction0String = "";
                    var headsign0 = "";
                    var direction1String = "";
                    var headsign1 = "";

                    var dropOffTypesSeen = [];
                    var warnings = [];
                    var asteriskStrings = [];
                    // If we have stop headsigns instead of trip headsigns, sort by those
                    if (timesByRoute[route.route_id][0].stop_headsign && timesByRoute[route.route_id][0].stop_headsign != "") {
                        // If a stop has an odd pickup type, we need to show an explaination
                        timesByRoute[route.route_id].forEach(function(time) {
                            if (time.pickup_type != '0') {
                                if (!contains(dropOffTypesSeen, time.pickup_type)) {
                                    warnings.push(getPickupString(time.pickup_type));
                                    dropOffTypesSeen.push(time.pickup_type);
                                    var astStr = "";
                                    for (var i = 0; i < dropOffTypesSeen.length; i++)
                                        astStr += '*';
                                    asteriskStrings.push(astStr);
                                }
                            }
                            if (headsign0 == "")
                                headsign0 = time.stop_headsign;
                            if (headsign1 == "" && headsign0 != time.stop_headsign)
                                headsign1 = time.stop_headsign;
                            if (headsign1 == time.stop_headsign) {
                                if (freqByTrip && freqByTrip[time.trip_id] && !freqTripsShown[time.trip_id]) {
                                    freqByTrip[time.trip_id].forEach(function(freq) {
                                        direction1String += generateFreqItem(freq);
                                    });
                                    freqTripsShown[time.trip_id] = "";
                                } else {
                                    direction1String += generateTimeItem(time, asteriskStrings[dropOffTypesSeen.indexOf(time.pickup_type)]);
                                }
                            } else if (headsign0 == time.stop_headsign) {

                                if (freqByTrip && freqByTrip[time.trip_id] && !freqTripsShown[time.trip_id]) {
                                    freqByTrip[time.trip_id].forEach(function(freq) {
                                        direction0String += generateFreqItem(freq);
                                    });
                                    freqTripsShown[time.trip_id] = "";
                                } else {
                                    direction0String += generateTimeItem(time, asteriskStrings[dropOffTypesSeen.indexOf(time.pickup_type)]);
                                }
                            } else
                                console.log("ERROR: Entry has no stop headsign", time);
                        });

                    } else {
                        timesByRoute[route.route_id].forEach(function(time) {
                            // If a stop has an odd pickup type, we need to show an explaination
                            if (time.pickup_type != '0') {
                                if (!contains(dropOffTypesSeen, time.pickup_type)) {
                                    warnings.push(getPickupString(time.pickup_type));
                                    dropOffTypesSeen.push(time.pickup_type);
                                    var astStr = "";
                                    for (var i = 0; i < dropOffTypesSeen.length; i++)
                                        astStr += '*';
                                    asteriskStrings.push(astStr);
                                }
                            }
                            var trip = tripById[time.trip_id][0];
                            if (trip.direction_id === '1') {
                                if (freqByTrip && freqByTrip[time.trip_id] && !freqTripsShown[time.trip_id]) {
                                    freqByTrip[time.trip_id].forEach(function(freq) {
                                        direction1String += generateFreqItem(freq);
                                    });
                                    freqTripsShown[time.trip_id] = "";
                                } else {
                                    direction1String += generateTimeItem(time, asteriskStrings[dropOffTypesSeen.indexOf(time.pickup_type)]);
                                }
                                if (!trip.trip_headsign == "") {
                                    headsign1 = trip.trip_headsign;
                                }
                            } else {
                                if (freqByTrip && freqByTrip[time.trip_id] && !freqTripsShown[time.trip_id]) {
                                    freqByTrip[time.trip_id].forEach(function(freq) {
                                        direction0String += generateFreqItem(freq);
                                    });
                                    freqTripsShown[time.trip_id] = "";
                                } else {
                                    direction0String += generateTimeItem(time, asteriskStrings[dropOffTypesSeen.indexOf(time.pickup_type)]);
                                }
                                if (!trip.trip_headsign == "") {
                                    headsign0 = trip.trip_headsign;
                                }
                            }

                        });
                    }
					
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
					popupStr += table;
                    warnings.forEach(function(warningMsg) {
                        var index = warnings.indexOf(warningMsg);
                        popupStr += "<p>" + asteriskStrings[index] + ": " + warningMsg + "</p><br>";
                    });
                    popupStr += "</div>";
                }

            });

            marker = L.npmap.layer.geojson({
                data: geojson,
                styles: style,
                popup: {
                    description: popupStr
                }
            });
            markerLayer.addLayer(marker);
        }
    });
    map.addLayer(markerLayer);
}

function pickMarkerIcon(routeType) {
    if (routeType) {
        if (routeType === '2')
            return 'rail';
        if (routeType === '3')
            return 'bus';
        if (routeType === '4')
            return 'ferry';
    }
    return 'rail';
}

//Generate HTML for list items in popup
function generateFreqItem(freq, optionalStr) {
    return "<li>Every " + parseHeadwaySecs(freq.headway_secs) + " from " + parseTime(freq.start_time) + " to " + parseTime(freq.end_time) + optionalStr ? optionalStr : '' + "</li>";
}

function generateTimeItem(time, optionalStr) {
	if (optionalStr)
		return "<li>" + parseTime(time.departure_time) + optionalStr + "</li>";
    return "<li>" + parseTime(time.departure_time) + "</li>";
}

// Helper functions
function parseDate(str) {
    if (!/^(\d){8}$/.test(str)) return "invalid date";
    var y = str.substr(0, 4),
        m = str.substr(4, 2) - 1,
        d = str.substr(6, 2);
    return new Date(y, m, d);
}

Date.prototype.yyyymmdd = function() {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
    var dd = this.getDate().toString();
    return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]); // padding
};


function parseTime(timeStr) {
    var time = timeStr.split(":");
    var suffix = "A.M.";
    var hours = parseInt(time[0]);
    if (hours >= 24) {
        hours = hours - 24
    };
    if (hours > 12 && hours < 24) {
        hours = hours - 12;
        suffix = "P.M.";
    }
    if (hours == 0) {
        hours = 12;
    }
    if (hours == 12) {
        suffix = "P.M.";
    }
    return hours.toString() + ":" + time[1] + " " + suffix;
}

function parseHeadwaySecs(secs) {
    var string = "";
    if (secs >= 3600) {
        var numHours = secs / 3600;
        secs = secs % 3600;
        string += numHours;
        if (numHours == 1)
            string += " hour"
        else
            string += " hours";
        if (secs != 0 && secs > 60)
            string += " and "
        else
            return string;
    }
    var numMinutes = secs / 60;
    string += numMinutes + " minutes"
    return string;
}

function getPickupString(type) {
    if (type) {
        if (type === '1')
            return "No pickup available";
        if (type === '2')
            return "Must notify agency to arrange pickup"
        if (type === '3')
            return "Must coordinate with driver to arrange pickup"
        return "";
    }
    return '';
}

function getDayString(dayInt) {
    switch (dayInt) {
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
        if (!memo[x[property]]) {
            memo[x[property]] = [];
        }
        memo[x[property]].push(x);
        return memo;
    }, {});
}

function getPathFromUrl(url) {
    return url.split("?")[0];
}

function stringToBoolean(string) {
    switch (string.toLowerCase().trim()) {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
        case null:
            return false;
        default:
            return Boolean(string);
    }
}