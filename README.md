# gtfs-map

A GIS application using the NPMaps library designed to display information from GTFS feeds for national parks.  Written using Javascript.

The application currently displays GTFS Feeds for 3 parks:

Cuyahoga Valley National Park: https://ldnash.github.io/gtfs-map/Map/GTFS_NPMaps.html
Boston Harbor Islands: https://ldnash.github.io/gtfs-map/Map/GTFS_NPMaps.html?parkId=boha
Rocky Mountain National Park (and Estes Park): https://ldnash.github.io/gtfs-map/Map/GTFS_NPMaps.html?parkId=romo

GTFS Feeds used by this application may be found on Github at https://github.com/nationalparkservice/nps-gtfs
Estes Park feeds may be found in this project, within the "EstesFeed" directory.


Most code for this application may be found in "Map/loadgtfs.js", which fetches and parses the GTFS feeds, and uses this to create map objects.


Libraries Used by this project

jQueryUI - https://jqueryui.com/
Leaflet.MarkerCluster - https://github.com/Leaflet/Leaflet.markercluster
