var isIE = /*@cc_on!@*/ false || !!document.documentMode;

if (isIE) {
	alert("Det verkar som att du använder Internet Explorer. Vissa funktioner på sajten kan därför fungera dåligt. Vänligen överväg att byta till en modern webbläsare, såsom Chrome eller Firefox.")
}

var globalValues, clickArea, parkeringar, aktivParkering, referefenceMidpoints, scaler, categoryColumns
var shownFIDs = []
var currentLocation = {}
var minZoomToLoadFeatures = 16

function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
	var p = 0.017453292519943295;    // Math.PI / 180
	var c = Math.cos;
	var a = 0.5 - c((lat2 - lat1) * p)/2 + 
			  c(lat1 * p) * c(lat2 * p) * 
			  (1 - c((lon2 - lon1) * p))/2;
	return 12742000 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

var OpenStreetMap_BlackAndWhite = L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
})

var Hydda_Full = L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: 'Tiles courtesy of <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var baseMaps = {
	"Ljus": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGVycmthcmxzb24iLCJhIjoiY2p1MW9td3ZpMDNrazQ0cGVmMDltc3EwaSJ9.0h6iBb8t7laIu-xP7YE4CQ', {
		tileSize: 512,
		zoomOffset: -1,
	}),
	"Normal": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGVycmthcmxzb24iLCJhIjoiY2p1MW9td3ZpMDNrazQ0cGVmMDltc3EwaSJ9.0h6iBb8t7laIu-xP7YE4CQ', {
		tileSize: 512,
		zoomOffset: -1,
	}),
	"Satellit": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
	}),
	"Mörk": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaGVycmthcmxzb24iLCJhIjoiY2p1MW9td3ZpMDNrazQ0cGVmMDltc3EwaSJ9.0h6iBb8t7laIu-xP7YE4CQ'),
}

var map = L.map('map', {
	//center: [59.3274541, 18.0543566],
	//zoom: 13,
	layers: [baseMaps['Normal']],
	zoomControl: false,
})

var goToPositionButton = L.Control.extend({
	options: {
		position: 'topright'
	},
	onAdd: function(map) {
		//<button id="add-button" type="button" class="btn btn-secondary btn-sm"><span class="fa fa-location-arrow"></span></button>
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom btn btn-secondary btn-sm');
		container.appendChild(L.DomUtil.create('span', 'fa fa-location-arrow'))
		container.onclick = function() {
			map.panTo(currentLocation.dot._latlng)
		}
		return container;
	}
});

map.addControl(new goToPositionButton());

function disableSubmitFields() {
	$('.form-control').attr('disabled', true)
	$('#submit-button').attr('disabled', true)
	$('#bottom-floater').hide()
}


$(document).ready(function() {
	$('#add-button').click(function() {
		//alert("button pressed");
		console.log(currentLocation.dot)
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
	if ($('[name="ParkedCars"]').val() + $('[name="FreeSpots"]').val() + $('[name="TotalSpots"]').val() + $('[name="IllegalParkings"]').val() + $('[name="Comments"]').val() == '') {
		$('#submit-button').attr('disabled', true)
	} else {
		$('#submit-button').attr('disabled', false)

	}
});

function onLocationFound(e) {
	//L.marker(e.latlng).addTo(map)
	//	.bindPopup("You are within " + radius + " meters from this point").openPopup();
	e.latlng = [e.coords.latitude, e.coords.longitude];

	if (currentLocation.dot) {
		map.removeLayer(currentLocation.dot)
		map.removeLayer(currentLocation.circle)
	}
	currentLocation.dot = L.circle(e.latlng, {
		radius: e.coords.accuracy / 2,
		fillColor: colors.black100,
		color: colors.black100,
		weight: .5,
		opacity: 1,
		fillOpacity: 0.05
	}).addTo(map);

	currentLocation.circle = L.circle(e.latlng, {
		radius: 1,
		fillColor: colors.black100,
		color: colors.black100,
		weight: 4,
		opacity: 1,
		fillOpacity: 0.8
	}).addTo(map);

}

//map.on('locationfound', onLocationFound);
map.locate({
	setView: true,
	zoom: 14,
	watch: false,
})

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

//Add layers to top right menu
L.control.layers(null, baseMaps, {
	position: 'topleft'
}).addTo(map)

function clearActiveSelectedParking() {
	if (aktivParkering) {
		map.removeLayer(aktivParkering)
	}
	$('[name="FeatureId"]').val('')
	disableSubmitFields()
		//$('.form-control').attr('disabled', false)
		//$('#bottom-floater').addClass('invisible')
}

function clearFormFields() {
	$('[name="ParkedCars"]').val('')
	$('[name="FreeSpots"]').val('')
	$('[name="TotalSpots"]').val('')
	$('[name="IllegalParkings"]').val('')
	$('[name="Comments"]').val('')
}

function getLengthOfParkering(ap){
	console.log(ap)
	var coords = ap._layers[Object.keys(ap._layers)[0]]._latlngs;
	var length = 0
	for (let i = 0; i < coords.length; i++) {
		if (i > 0) {
			length += getDistanceFromLatLon(previousPoint.lat,previousPoint.lng,coords[i].lat,coords[i].lng)
		}
		previousPoint = coords[i];
	}
	console.log(length)
	return Math.round(length)
}

function jsSubmitForm(e) {
	var es = $(e).serialize()

	navigator.geolocation.getCurrentPosition(function(position) {
		es += '&SenderLocation='
		es += position.coords.latitude + ',' + position.coords.longitude
		es += '&FeatureMidpoint='
		es += aktivParkering.getBounds().getCenter().lat + ',' + aktivParkering.getBounds().getCenter().lng
		es += '&FeatureLength='
		es += getLengthOfParkering(aktivParkering)
		console.log('The variable "es" to be json-ified and submitted is a ' + typeof es + ' and has the following value:')
		console.log(es)
		$.post($(e).attr('js_action'), es, function(response) {
			// do something here on success
			console.log(response)
			$(e).append
		}, 'json');
		recolorThisFeature(e.elements.FeatureId.value)
		clearFormFields()
		map.closePopup();
	})
	clearActiveSelectedParking()
	return false;
}

function panMapToPosition(position) {
	onLocationFound(position)
}

function getLocation() {
	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(panMapToPosition)
	} else {
		console.log("Geolocation is not supported by this browser.")
		$('[name="SenderLocation"]').val('NotAvailable')
	}

}

getLocation()

map.on({
	click: function(e) {
		if (e.originalEvent.target.id == 'map') { //Grejen efter && gör så att detta endast händer när man klickar på baskartan, inte på en feature.
			//console.log(e.originalEvent.target.id)
			clearActiveSelectedParking()
		}
	}
})

function uuidv4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	)
}

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
	//console.log(Math.random())
	var n = map.getBounds()._northEast.lat
	var e = map.getBounds()._northEast.lng
	var s = map.getBounds()._southWest.lat
	var w = map.getBounds()._southWest.lng
	var fgc = feature.geometry.coordinates
	var ns1 = fgc[0][1]
	var ew1 = fgc[0][0]
	var ns2 = fgc[fgc.length - 1][1]
	var ew2 = fgc[fgc.length - 1][0]

	i = feature.properties.FID
	if (((ew1 < e && ns1 < n && ew1 > w && ns1 > s) || (ew2 < e && ns2 < n && ew2 > w && ns2 > s)) && map.getZoom() >= minZoomToLoadFeatures && shownFIDs.indexOf(i) == -1) {
		shownFIDs.push(i)
		console.log("Adding another feature to the map...")
		return true
	}
	return false
}

function tooZoomedStatusChange() {
	if (map.getZoom() < minZoomToLoadFeatures) {
		$('#too-zoomed-out-warning').removeClass('invisible')
	} else {
		$('#too-zoomed-out-warning').addClass('invisible')
	}
}

map.on('moveend', function() {
	loadParkingLines()
	tooZoomedStatusChange()
});

function onEachFeature(feature, layer) {
	layer.on({
		click: function(e) {
			if (aktivParkering) {
				clearActiveSelectedParking()
			}
			$('[name="FeatureId"]').val(feature.properties.FID)
			$('.form-control').attr('disabled', false)
			$('#bottom-floater').show()

			aktivParkering = L.geoJson(e.sourceTarget.feature, {
				//onEachFeature: onEachFeature,
				style: function(params) {
					return {
						weight: 18,
						color: colors.yellow100,
						lineCap: 'round',
						opacity: .8,
					}
				}
			}).addTo(map).bringToBack()
			map.panTo(aktivParkering.getBounds().getCenter())
		}
	});
}

function recolorThisFeature(fid) {
	parkeringar.eachLayer(function(layer) {
		if (layer.feature.properties.FID == fid) {
			layer.setStyle({
				color: 'red'
			})
		}
	})
}

function getGeojsonCenter(f){
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
	return {'x':(xMax+xMin),'y':(yMax+yMin)} //For some really weird reason, I shouldn't divide with 2 to get the average between min an max. I don't understand how, but this works.
}

function determineCororThroughML(f){
	console.log(f)
	let X = []
	var la, lo

	c = getGeojsonCenter(f)
	for (var i in scaler['name']){
		x = scaler['name'][i]
		if (x in nowX){
			X.push(nowX[x])
		}
		else if (x in referefenceMidpoints){
			la = String(referefenceMidpoints[x]).split(',')[0]
			lo = String(referefenceMidpoints[x]).split(',')[1]
			//console.log(c.y + ',' + c.x + ' - ' + la + ',' + lo)
			X.push(getDistanceFromLatLon(c.y,c.x,la,lo))
		}
		else if (x.substr(0, 4) == 'cat_') { //Making one-hots
			var cat = x.substr(4, x.lastIndexOf('_') - 4)
			var catVal = x.substr(x.lastIndexOf('_') + 1)
			//console.log('Checking if nowX[' + cat + '] (' + nowX[cat] + ') == ' + catVal)
			if (nowX[cat] == catVal) {
				//console.log('it was')
				X.push(1)
			} else {
				X.push(0)
			}
			//delete nowX[cat]
		}
		else{
			console.log('x (' + x + ') not anywhere')
		}
	}
	for (var i in referefenceMidpoints){
		
	}
	console.log(X)
	//Normalizing
	var normalizedX = []
	for (var i in X) {
		normalizedX.push((X[i] - scaler.mean[i]) / scaler.scale[i]) //(normVals.max[i] - normVals.min[i])
	}

	console.log(normalizedX)
	tf_x = tf.tensor(normalizedX)
	tf_x = tf_x.reshape([1, normalizedX.length])

	const pred = model.predict(tf_x).dataSync()

	console.log(pred)

	return colors.blue100
}

function loadParkingLines() {
	parkeringar = L.geoJson(globalValues, {
		//onEachFeature: onEachFeature,
		filter: function(feature, layer) {
			return withinViewAndNotInMap(feature)
		},
		style: function(feature,layer) {
			return {
				weight: 8,
				color: determineCororThroughML(feature),
				lineCap: 'butt',
				opacity: 0.7,
			}
		}
	}).addTo(map)
	clickArea = L.geoJson(globalValues, {
		onEachFeature: onEachFeature,
		filter: function(feature, layer) {
			return shownFIDs.indexOf(feature.properties.FID) > -1
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
}

var serial = 'FeatureId=30228714&SenderLocation=59.32041214046096,17.988411617590103&FeatureMidpoint=59.3202055,17.987212&FeatureLength=39' //Placeholder
var nowX = new Promise(function(resolve, reject) {
	$.get($("#gform").attr('js_action'), serial, function(response) {
		//console.log(response)
		var data = JSON.parse(response)
		console.log(data)
		var resolver = {}
		for (var i in data['field']) {
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

var promiseOfGeojsonData = new Promise(function(resolve, reject) {
	$.getJSON("../data/allaParkeringarSthlmStad.geojson", function(data) {
		resolve(data)
	});
});

var model = new Promise(function(resolve, reject) {
	const data = tf.loadLayersModel('../data/model.json');
	resolve(data)
});

var referefenceMidpoints = new Promise(function(resolve, reject) {
	$.getJSON("../data/referenceMidpoints.json", function(data) {
		resolve(data)
	});
});

var scaler = new Promise(function(resolve, reject) {
	$.getJSON("../data/scaler.json", function(data) {
		resolve(data)
	});
});

var superflousAttributes = new Promise(function(resolve, reject) {
	$.getJSON("../data/superflousAttributes.json", function(data) {
		resolve(data)
	});
});

var categoryColumns = new Promise(function(resolve, reject) {
	$.getJSON("../data/categoryColumns.json", function(data) {
		resolve(data)
	});
});

Promise.all([nowX,promiseOfGeojsonData,model,referefenceMidpoints,scaler,superflousAttributes,categoryColumns]).then(function(values) {
	nowX = values[0]
	globalValues = values[1]
	model = values[2]
	referefenceMidpoints = values[3]
	scaler = values[4]
	superflousAttributes = values[5]
	categoryColumns = values[6]

	console.log(nowX)
	console.log(globalValues)
	console.log(model)
	console.log(referefenceMidpoints)
	console.log(scaler)
	console.log(superflousAttributes)
	console.log(categoryColumns)



	loadParkingLines()

	var legend = L.control({
		position: 'topleft',
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
	//legend.addTo(map); //Uncomment to add
	disableSubmitFields()
});


//Lägg in analytics
//Fixa legend igen
//Fixa totaler i legend
//Föreslå ny plats-funktion


