var today = new Date();
var helgdataToKeep = {}
var daysBeforeToKeep = 6
var daysAfterToKeep = 7 //Including current day

function addDays(date, days) {
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
  }

function isObject(thing){
	return (typeof thing === 'object' && !Array.isArray(thing) && thing !== null)
}
function isRedDay(date){
	return + date.getDay() == 0 || isObject(isHoliday(date))
}

function isWorkFreeDay(date){
	return + (isRedDay(date) || date.getDay() == 6)
}

const weekDayMap = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag']

for (var m = -daysBeforeToKeep; m < daysAfterToKeep; m++) {
	thisDate = addDays(today,m)
	console.log(thisDate)
	helgdataToKeep['redDay' + m] = isRedDay(thisDate)
	helgdataToKeep['workFreeDay' + m] = isWorkFreeDay(thisDate)
	if (m == 0) {
	  helgdataToKeep['weekday'] = weekDayMap[thisDate.getDay()]
	} 
	if(today.getDay() == 6 || today.getDay() == 0) alert('Weekend!');
	
}

helgdataToKeep = JSON.stringify(helgdataToKeep)

var isIE = /*@cc_on!@*/ false || !!document.documentMode;

if (isIE) {
	alert("Det verkar som att du använder Internet Explorer. Vissa funktioner på sajten kan därför fungera dåligt. Vänligen överväg att byta till en modern webbläsare, såsom Chrome eller Firefox.")
}

function uuidv4() {
	return ([1e3] + 1e3).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	)
}

function CSVToArray(strData, strDelimiter) {
	strDelimiter = (strDelimiter || ",");
	var objPattern = new RegExp(
		(
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
			"([^\"\\" + strDelimiter + "\\r\\n]*))"
		),
		"gi"
	);
	var arrData = [
		[]
	];
	var arrMatches = null;
	while (arrMatches = objPattern.exec(strData)) {
		var strMatchedDelimiter = arrMatches[1];
		if (
			strMatchedDelimiter.length &&
			strMatchedDelimiter !== strDelimiter
		) {
			arrData.push([]);
		}
		var strMatchedValue;
		if (arrMatches[2]) {
			strMatchedValue = arrMatches[2].replace(
				new RegExp("\"\"", "g"),
				"\""
			);
		} else {
			strMatchedValue = arrMatches[3];

		}
		arrData[arrData.length - 1].push(strMatchedValue);
	}
	return (arrData);
}

if (document.cookie.indexOf('uuid=') == -1) {
	document.cookie='uuid=' + uuidv4()
}

var uuid = document.cookie.split('=')[1]


var clickArea, activeParking, referenceMidpoints, scaler
var shownFIDs = []
var currentLocation = {}
var minZoomToLoadFeatures = 16
var firstLocationFound = false
var heavyDataLoaded = false

function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
	var p = 0.017453292519943295;    // Math.PI / 180
	var c = Math.cos;
	var a = 0.5 - c((lat2 - lat1) * p)/2 + 
			  c(lat1 * p) * c(lat2 * p) * 
			  (1 - c((lon2 - lon1) * p))/2;
	return 12742000 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

const baseMaps = {
	"MapBox Light": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGVycmthcmxzb24iLCJhIjoiY2p1MW9td3ZpMDNrazQ0cGVmMDltc3EwaSJ9.0h6iBb8t7laIu-xP7YE4CQ', {
	tileSize: 512,
	zoomOffset: -1,
	}),
	"Google Satellite": L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
		maxZoom: 20,
		subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
	}),
	"ArcGIS Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
		opacity: .8
	})/*,
	"MapBox Normal": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGVycmthcmxzb24iLCJhIjoiY2p1MW9td3ZpMDNrazQ0cGVmMDltc3EwaSJ9.0h6iBb8t7laIu-xP7YE4CQ', {
		tileSize: 512,
		zoomOffset: -1,
	}),
	"MapBox Dark": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGVycmthcmxzb24iLCJhIjoiY2p1MW9td3ZpMDNrazQ0cGVmMDltc3EwaSJ9.0h6iBb8t7laIu-xP7YE4CQ', {
		tileSize: 512,
		zoomOffset: -1,
	}),
	"Google Streets": L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
		maxZoom: 20,
		subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
	}),
	"Google Terrain": L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
		maxZoom: 20,
		subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
	}),
	'OpenStreetMap B&W': L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		opacity:.5
	}),
	'OpenStreetMap Color': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}),*/
}

var map = L.map('map', {
	center: [59.3274541, 18.0543566],
	zoom: 11,
	layers: [baseMaps['MapBox Light']],
	zoomControl: false
})

L.control.layers(baseMaps, null, {
	//position: 'topleft'
}).addTo(map)

var parkeringar = L.layerGroup([]).addTo(map); 

var goToPositionButton = L.Control.extend({
	options: {
		//position: 'topright'
	},
	onAdd: function(map) {
		//<button id="add-button" type="button" class="btn btn-secondary btn-sm"><span class="fa fa-location-arrow"></span></button>
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom btn btn-light btn-sm');
		container.appendChild(L.DomUtil.create('span', 'fa fa-location-arrow'))
		container.onclick = function() {
			map.panTo(currentLocation.dot._latlng)
		}
		return container;
	}
});

var infoButton = L.Control.extend({
	options: {
		position: 'topleft'
	},
	onAdd: function(map) {
		//<button id="add-button" type="button" class="btn btn-secondary btn-sm"><span class="fa fa-location-arrow"></span></button>
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom btn btn-light btn-sm');
		container.appendChild(L.DomUtil.create('span', 'fa fa-info-circle'))
		container.onclick = function(e) {
			console.log(e)
			updateInfoBox('This thing shows the probability of parking being available based on a ML model taught by previous observations of a few locations. So far, the accuracy is about ' + Math.round(modelPertformance.binary_accuracy * 100) + ' %. Made by <a href="mailto:sven.henrik.karlsson@gmail.com">Henrik Karlsson</a>.')
		}
		return container;
	}
});

map.addControl(new goToPositionButton());
map.addControl(new infoButton());

function disableSubmitFields() {
	$('.form-control').attr('disabled', true)
	//$('#submit-button').attr('disabled', true) //Uncomment when using more detailed observation fields.
	$('#gform').hide().css('height', '0px');
	$('#legend').show().css('height', '');
}

function updateInfoBox(text){
	if (text.length == 0){
		$('#info-box').addClass('invisible')
	}
	else {
		$('#info-box').removeClass('invisible')
		textWidthStringWithPx = (text.length*(-3.03)-8).toString() + 'px'
		$('#info-box').css({marginLeft:textWidthStringWithPx})
		$('#info-box').html('<strong>' + text + '</strong>')
	}
}

$(document).ready(function() {
	disableSubmitFields()
	updateInfoBox('Zoom in to load parking data.')
	//$('#info-box').removeClass('invisible')
	//$('#info-box').html('<strong>Loading lots of data...</strong>')
	try {
		navigator.geolocation.watchPosition(onLocationFound)
	} catch (evt){
		//console.log(evt)
		console.log("No geolocation given...")
		//$('[name="SenderLocation"]').val('NotAvailable')
	}

	$('#add-button').click(function() {
		//alert("button pressed");
		//console.log(currentLocation.dot)
		map.panTo(currentLocation.dot._latlng)
	});
});

$(document).keyup(function(e) {
	if (e.key === "Escape") { // escape key maps to keycode `27`
		disableSubmitFields()
		$('#add-button').removeClass('btn-primary').addClass('btn-secondary')
		clearActiveSelectedParking()
		clearFormFields()
	}
	/*if ($('[name="ParkedCars"]').val() + $('[name="FreeSpots"]').val() + $('[name="TotalSpots"]').val() + $('[name="IllegalParkings"]').val() + $('[name="Comments"]').val() == '') {
		$('#submit-button').attr('disabled', true)
	} else {
		$('#submit-button').attr('disabled', false)
	}*/ //Uncomment when using detailed observation fields
});

function onLocationFound(e) {
	console.log('running onLocationFound(e)')
	console.log(e)
	e.latlng = [e.coords.latitude, e.coords.longitude];
	if (!firstLocationFound){
		map.setView(e.latlng,18);
		firstLocationFound = true
	}

	if (currentLocation.dot) {
		map.removeLayer(currentLocation.dot)
		map.removeLayer(currentLocation.circle)
	}
	currentLocation.dot = L.circle(e.latlng, {
		radius: e.coords.accuracy / 2,
		fillColor: colors.blue100,
		color: colors.blue100,
		weight: .5,
		opacity: 1,
		fillOpacity: 0.05
	}).addTo(map);

	currentLocation.circle = L.circle(e.latlng, {
		radius: 1,
		fillColor: colors.blue100,
		color: colors.blue100,
		weight: 4,
		opacity: 1,
		fillOpacity: 0.8
	}).addTo(map);
}

var colors = {
	'red99': '#e6194B',
	'green99': '#3cb44b',
	'yellow100': '#ffe119',
	'blue100': '#4363d8',
	'orange9999': '#f58231',
	'purple95': '#911eb4',
	'cyan99': '#42d4f4',
	'magenta99': '#f032e6',
	'lime95': '#bfef45',
	'pink9999': '#fabebe',
	'teal99': '#469990',
	'lavender9999': '#e6beff',
	'brown99': '#9A6324',
	'beige99': '#fffac8',
	'maroon9999': '#800000',
	'mint99': '#aaffc3',
	'olive95': '#808000',
	'apricot95': '#ffd8b1',
	'navy9999': '#000075',
	'grey100': '#a9a9a9',
	'white100': '#ffffff',
	'black100': '#000000',
}

function clearActiveSelectedParking() {
	if (activeParking) {
		map.removeLayer(activeParking)
	}
	$('[name="FeatureId"]').val('')
	disableSubmitFields()
	//$('.form-control').attr('disabled', false)
	//$('#gform').addClass('invisible')
}

function clearFormFields() {
	$('[name="ParkedCars"]').val('')
	$('[name="FreeSpots"]').val('')
	$('[name="TotalSpots"]').val('')
	$('[name="IllegalParkings"]').val('')
	$('[name="Comments"]').val('')
}

function getLengthOfParking(ap){
	var length = 0
	if ('_leaflet_id' in ap){ //This means a leaflet layer is being used.
		var coords = ap._layers[Object.keys(ap._layers)[0]]._latlngs;
	}
	else { //This means a geojson feature is being used
		var coords = []
		for (i in ap.geometry.coordinates) {
			coords.push({'lat':ap.geometry.coordinates[i][1],'lng':ap.geometry.coordinates[i][0]})
		}
	}
	
	for (let i = 0; i < coords.length; i++) {
		if (i > 0) {
			length += getDistanceFromLatLon(previousPoint.lat,previousPoint.lng,coords[i].lat,coords[i].lng)
		}
		previousPoint = coords[i];
	}
	return Math.round(length)
}
const unusedObservationValues = ['ParkedCars', 'TotalSpots', 'FreeSpots','IllegalParkings', 'Comments']

function jsSubmitForm(e,fs) {
	var es = $(e).serialize()
	for (var i in unusedObservationValues){
		es += '&' + unusedObservationValues[i] + '='
	}
	es += '&FreeSpot=' + fs
	if ('dot' in currentLocation){
		es += '&SenderLocation=' + currentLocation.dot._latlng.lat + ',' + currentLocation.dot._latlng.lng
	}
	es += '&FeatureMidpoint=' + activeParking.getBounds().getCenter().lat + ',' + activeParking.getBounds().getCenter().lng
	es += '&FeatureLength=' + getLengthOfParking(activeParking)
	es += '&uuid=' + uuid
	console.log('The variable "es" to be json-ified and submitted is a ' + typeof es + ' and has the following value:')
	console.log(es)
	$.post($(e).attr('js_action'), es, function(response) {
		console.log(response)
		$(e).append
	}, 'json');

	if (fs == 1){
		newColor = colors.green99
	} else if (fs == 0){
		newColor = colors.red99
	}
	parkeringar.eachLayer(function (layer) {  
		lgl = layer.pm._layerGroup._layers
		for (var l in lgl){
			if (lgl[l].feature.FID == e.elements.FeatureId.value){
				lgl[l].setStyle({color: newColor})
			}
		}
	});

	
	clearFormFields()
	map.closePopup();
	
	clearActiveSelectedParking()
	return false;
}

map.on({
	click: function(e) {
		if (e.originalEvent.target.id == 'map') { 
			clearActiveSelectedParking()
		}
	}
})

map.on('pm:create', e => {
	console.log(e);
	var geojsonToSheets = e.layer.toGeoJSON()
	geojsonToSheets.properties.uuid = uuidv4()
	geojsonToSheets.properties.userInfo = window.navigator
	console.log(geojsonToSheets)
});

function containsObject(obj, list) {
	var i;
	for (i = 0; i < list.length; i++) {
		if (list[i] === obj) {
			return true;
		}
	}
	return false;
}

function withinViewAndNotInMap(feature) {
	y_marg = 0.002 // ≈59.321295 - 59.320403 * 2
	x_marg = 0.006 // ≈17.991302 - 17.988620 * 2
	var n = map.getBounds()._northEast.lat + y_marg
	var e = map.getBounds()._northEast.lng + x_marg
	var s = map.getBounds()._southWest.lat - y_marg
	var w = map.getBounds()._southWest.lng - x_marg
	var fgc = feature.geometry.coordinates
	var ns1 = fgc[0][1]
	var ew1 = fgc[0][0]
	var ns2 = fgc[fgc.length - 1][1]
	var ew2 = fgc[fgc.length - 1][0]

	i = feature.FID
	if (((ew1 < e && ns1 < n && ew1 > w && ns1 > s) || (ew2 < e && ns2 < n && ew2 > w && ns2 > s)) && shownFIDs.indexOf(i) == -1) {
		shownFIDs.push(i)
		return true
	}
	return false
}

function checkZoomAndUserLocAndHeavyDataLoaded() {
	if (map.getZoom() < minZoomToLoadFeatures) {
		if (shownFIDs.length > 0){
			updateInfoBox('Zoom in to load more parking data.')
		} else{
			updateInfoBox('Zoom in to load parking data.')
		}
		return true
	} else {
		if (!heavyDataLoaded) {
			updateInfoBox('Loading lots of data...')
			return true
		}
		else if (shownFIDs.length == 0) { //This is for the first load which can be a bit heavy.
			updateInfoBox('Figuring out parking availability...')
		}
		else {
			updateInfoBox('')
			return false
		}
	}
}

map.on('moveend', function() {
	loadParkingLines()
});

function onEachFeature(feature, layer) {
	layer.on({
		click: function(e) {
			if (activeParking) {
				clearActiveSelectedParking()
			}
			$('[name="FeatureId"]').val(feature.FID)
			$('.form-control').attr('disabled', false)
			$('#gform').show().css('height', '');
			$('#legend').hide().css('height', '0px');
			//console.log(allShownFeaturesData[feature.FID])

			activeParking = L.geoJson(e.sourceTarget.feature, {
				style: function(params) {
					return {
						weight: 18,
						color: colors.blue100,
						lineCap: 'round',
						opacity: .7,
					}
				}
			}).addTo(map).bringToBack()
			map.panTo(activeParking.getBounds().getCenter())
		}
	});
}


function getGeojsonCenter(f){
	//Gets the center of a feature so that the viewport can pan (and zoom) there.
	let xMin = 10^10
	let yMin = 10^10
	let xMax = -10^10
	let yMax = -10^10
	for (c in f.geometry.coordinates){
		cc = f.geometry.coordinates[c]
		if (cc[0] > xMax){
			xMax = cc[0]
		}
		if (cc[0] < xMin){
			xMin = cc[0]
		}
		if (cc[1] > yMax){
			yMax = cc[1]
		}
		if (cc[1] < yMin){
			yMin = cc[1]
		}
	}
	return {'x': (xMax+xMin),'y': (yMax+yMin)} //For some really weird reason, I shouldn't divide with 2 to get the average between min an max. I don't understand how, but this works. ¯\_(ツ)_/¯
}

function getWkDayNumber(dt){
	//Getting current week day as a number (0-6) for use as a feature in the neural net.
	w = dt.getDay()
	w -= 1
	if (w == -1){
		return 6
	}
	return w
}

var allShownFeaturesData = {}
function determineColorThroughML(f){
	let X = []
	var la, lo
	//Below is used for quickly (only once) finding the right row for osm data tied to parking locations. It's split up because the geojson file got too large when the info was contained there.

	//Finding the right row to get data from.
	for (rowNo in fixedXData){
		if (f.FID == fixedXData[rowNo][0]){
			break
		}
	}

	
	//Colleting values for (x) array to predict on.
	let dt = new Date()
	let t = (((dt.getSeconds() / 60 + dt.getMinutes()) / 60) + dt.getHours()) / 24
	let d = ((t + dt.getDate()) / 31 + dt.getMonth()) / 12
	let w = (t + getWkDayNumber(dt)) / 7

	timeFeatures = {
		timestamp: Date.now()/1000,
		sin_time: Math.sin(t),
		cos_time: Math.cos(t),
		sin_date: Math.sin(d),
		cos_date: Math.cos(d),
		sin_wkd: Math.sin(w),
		cos_wkd: Math.cos(w),
	}

	allShownFeaturesData[f.FID] = {}
	c = getGeojsonCenter(f)
	for (var i in scaler['name']){
		x = scaler['name'][i]
		if (x == 'FeatureLength') { //I need to do this because I can't send many leghts to google sheets.
			X.push(getLengthOfParking(f))
		}
		else if (x == 'ObservationsByUser'){
			X.push(100) //Some high number is provided so that it generates results that would be coming form users who submit many observations.
		}
		else if (x == 'ObservationsOfParking'){
			X.push(20) //Some high number is provided so that it generates results that would be coming form users who submit many observations.
		}
		else if (x in dataFromSheets){
			X.push(dataFromSheets[x])
		}
		else if (fixedXData[0].indexOf(x) > -1){ //Don't know why, but this works, not "x in parkeringWith...".
			colNo = fixedXData[0].indexOf(x)
			xVal = parseInt(fixedXData[rowNo][colNo])
 			X.push(xVal)
		}
		else if (x in timeFeatures){
			X.push(timeFeatures[x])
		}
		else if (x in referenceMidpoints){
			la = String(referenceMidpoints[x]).split(',')[0]
			lo = String(referenceMidpoints[x]).split(',')[1]
			X.push(getDistanceFromLatLon(c.y,c.x,la,lo))
		}
		else if (x.substr(0, 4) == 'cat_') { //Making one-hots
			var cat = x.substr(4, x.lastIndexOf('_') - 4)
			var catVal = x.substr(x.lastIndexOf('_') + 1)
			if (dataFromSheets[cat] == catVal) {
				X.push(1)
			} else {
				X.push(0)
			}
		}
		else{
			console.log('x (' + x + ') not anywhere')
		}
		if (isNaN(X[X.length-1])) {
			console.log(x + " is nan. That's not good...")
		}
		allShownFeaturesData[f.FID][x] = X[X.length-1]
	}

	//Normalizing array
	var normX = []
	for (var i in X) {
		normX.push((X[i] - scaler.mean[i]) / scaler.scale[i]) //(normVals.max[i] - normVals.min[i])
	}

	tf_x = tf.tensor(normX)
	//tf.dtypes.DType(tf_x).print()
	tf_x = tf_x.reshape([1, normX.length])
	//tf_x = tf_x.as_dtype(tf.float64)
  	
	const pred = Array.from(model.predict(tf_x).dataSync())
	for (var i in targetColumns){
		f[targetColumns[i]] = pred[i]
	}

	randBlur = (1 - Math.random() * 2) * 0//.1


	if (f.FreeSpot + randBlur >= .8){
		return colors.green99
	} else if (f.FreeSpot + randBlur >= .2){
		return colors.yellow100
	} else {
		return colors.red99
	}
}

function loadParkingLines() {
	if (!checkZoomAndUserLocAndHeavyDataLoaded()){
		setTimeout(function(){ //Don't know why, but this code runs before code right before it. Adding this 10 ms delay fixes that.
			parkeringar.addLayer(L.geoJson(geojson, {
				filter: function(feature, layer) {
					return withinViewAndNotInMap(feature)
				},
				style: function(feature,layer) {
					return {
						weight: 8,
						color: determineColorThroughML(feature),
						lineCap: 'butt',
						opacity: 0.7,
						smoothFactor: 3
					}
				}
			}))
			clickArea = L.geoJson(geojson, {
				onEachFeature: onEachFeature,
				filter: function(feature, layer) {
					return shownFIDs.indexOf(feature.FID) > -1
				},
				style: function(params) {
					return {
						weight: 20,
						color: colors.blue100,
						lineCap: 'butt',
						opacity: 0.0,
					}
				}
			}).addTo(map)
			if (shownFIDs.length == 0){
				updateInfoBox("Sorry. There's no data here...")
			} else{
				updateInfoBox('')
			}
		}, 10);
	}
}

var serial = 'FeatureId=30228714&SenderLocation=59.32041214046096,17.988411617590103&FeatureMidpoint=59.3202055,17.987212&FeatureLength=39' //These values have no bearing. The server just requires some data to provide a response.
serial += '&helgdatatokeep=' + helgdataToKeep
console.log(serial)
var dataFromSheets = new Promise(function(resolve, reject) {
	$.get($("#gform").attr('js_action'), serial, function(response) {
		console.log(response)
		var data = JSON.parse(response)
		console.log(data)
		var resolver = {}
		for (var i in data['field']) {
			console.log(i)
			if (Array.isArray(data['row'][i])) {
				data['row'][i] = data['row'][i][0]
			}
			if (!isNaN(parseFloat(data['row'][i]))) {
				data['row'][i] = parseFloat(data['row'][i])

			}
			if (data['row'][i] == null) {
				data['row'][i] = 0 //'undefined' //data['row'][i]  //Fixa detta så det blir rätt.
			}
			resolver[data['field'][i]] = data['row'][i]
		}
		
		resolve(resolver)
			//resolve(data)
	}, 'json');
});

var geojson = new Promise(function(resolve, reject) {
	$.getJSON("../data/allaParkeringar.geojson", function(data) {
		resolve(data)
	});
});

var model = new Promise(function(resolve, reject) {
	const data = tf.loadLayersModel('../data/model.json');
	resolve(data)
});

var otherRelevantData = new Promise(function(resolve, reject) {
	$.getJSON("../data/otherRelevantData.json", function(data) {
		resolve(data)
	});
});

var fixedXData = new Promise(function(resolve, reject) {
	$.get("../data/fixedXData.csv", function(data) {
		resolve(CSVToArray(data))
	});
});

Promise.all([dataFromSheets, geojson, model, otherRelevantData, fixedXData]).then(function(values) {
	dataFromSheets = values[0]
	geojson = values[1]
	model = values[2]
	referenceMidpoints = values[3]['reference_midpoints']
	scaler = values[3]['scaler']
	targetColumns = values[3]['target_columns']
	modelPertformance = values[3]['model_performance']
	fixedXData = values[4]
	console.log(dataFromSheets)
	console.log(geojson)
	console.log(model)
	console.log(referenceMidpoints)
	console.log(scaler)
	console.log(targetColumns)
	console.log(modelPertformance)
	console.log(fixedXData)
	heavyDataLoaded = true

	loadParkingLines()

	var legend = L.control({
		position: 'bottomright',
		collapsed: true
	});
	
	legend.onAdd = function(map) {
		var usedColors = {
			'High': colors.green99,
			'Medium': colors.yellow100,
			'Low': colors.red99,
			'Unknown': colors.blue100
		}
		var div = L.DomUtil.create('div', 'info legend');
		labels = ['<strong>Probability of availability</strong>']
		for (var i in usedColors) {
			div.innerHTML +=
				labels.push(
					' <svg width="30" height="14"><rect x="2" y="5" width="26" height="8" rx="2" ry="2" style="fill:none;stroke-width:2;stroke:' + usedColors[i] + '" /></svg>  ' + i);
		}
		div.innerHTML = labels.join('<br>');
		return div;
	};
	
	//disableSubmitFields()
});


//TODO:
//Make it so that it sets view when it receives GPS location again.
//Add totals in the legend
//Function for users to add parking

