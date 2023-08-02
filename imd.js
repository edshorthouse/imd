let parsedCsvData;
let geojsonData;
let imdToLsoaCodeMap;

var countTotal=window.countTotal;
var scoreCounts=window.scoreCounts;
	if (typeof scoreCounts === 'undefined') {
		scoreCounts = new Array(10).fill(0);
	}

// Helper function to get color based on IMD score
function getColorFromIMDScore(score) {
  // Ensure score is within the desired range (1 to 10)
  score = Math.max(1, Math.min(10, score));

  // Assign the color based on the score
  var color;
  switch(score) {
    case 1:
      color = "#FF0000";  // Red
      break;
    case 2:
      color = "#FF4040";  // Light Red
      break;
    case 3:
      color = "#FF8080";  // Salmon
      break;
    case 4:
      color = "#FFC0C0";  // Light Salmon
      break;
    case 5:
      color = "#FFE0E0";  // Pinkish White
      break;
    case 6:
      color = "#E0FFE0";  // Light Green-White
      break;
    case 7:
      color = "#C0FFC0";  // Light Green
      break;
    case 8:
      color = "#80FF80";  // Lime
      break;
    case 9:
      color = "#40FF40";  // Strong Lime
      break;
    case 10:
      color = "#00FF00";  // Green
      break;
    default:
      color = "#000000";  // Black if the score is somehow out of range
  }

  return color;
}

function fetchCsvAndUpdateDropdown() {
  const csvUrl = "https://raw.githubusercontent.com/edshorthouse/imd/71520fbc4b4fe6a07a412c97ee5dc7dc6d743c90/dropdownref.csv";

  // Fetch the CSV file
  fetch(csvUrl)
    .then(response => response.text())
    .then(data => {
      const parsedData = Papa.parse(data, { header: false });
      const items = parsedData.data.flat().map(item => item.trim()); // Flatten and trim the 2D array

      // Clear existing options from the dropdown
      dropdown.innerHTML = '';

      // Populate the dropdown with options
      items.forEach(item => {
        const option = document.createElement('option');
        option.text = item; // Already trimmed, no need to trim again
        dropdown.add(option);
      });
    })
    .catch(error => console.error('Error fetching the CSV file:', error));
}

fetchCsvAndUpdateDropdown() 

function fetchAndUpdateData() {
  var domainDropdown = document.getElementById('domain');
  var selectedDomain = domainDropdown.value.trim();
  var dropdown = document.getElementById('dropdown');
  var selectedOption = dropdown.value.trim();

  markers.clearLayers();

  const csvUrl = "https://raw.githubusercontent.com/edshorthouse/imd/71520fbc4b4fe6a07a412c97ee5dc7dc6d743c90/dropdownref.csv";
  const geoJsonUrl = "https://raw.githubusercontent.com/edshorthouse/imdref/main/Lower_Super_Output_Area_(LSOA)_IMD_2019__(OSGB1936).geojson";
  const imdCsvUrl = "https://raw.githubusercontent.com/edshorthouse/imd/ffa1a9662916ffad606c716675328e09b0e6ae47/IMD2019.csv";

  fetch(geoJsonUrl)
    .then(response => response.json())
    .then(geojsonData => {
      fetch(imdCsvUrl)
        .then(response => response.text())
        .then(csvData => {
          var imdToLsoaCodeMap = {};
          var csvOptions = {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
              var imdData = results.data;
              imdData.forEach(function (row) {
                var lsoaCode = row["LSOA code"];
                var imdScore = parseInt(row[selectedDomain]);
                imdToLsoaCodeMap[lsoaCode.toString()] = imdScore;
              });

              L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              }).addTo(map);

              var filteredFeatures = geojsonData.features.filter(function (feature) {
                if (selectedOption === "Derby") {
                  return feature.properties.lsoa11nm.includes("Derby") && !feature.properties.lsoa11nm.includes("Derbyshire");
                } else if (selectedOption === "Stafford") {
                  return feature.properties.lsoa11nm.includes("Stafford") && !feature.properties.lsoa11nm.includes("Staffordshire");
                } else {
                  return listEValues.includes(feature.properties.lsoa11nm.slice(0, -5));
                }
              });

              var scoreCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

              filteredFeatures.forEach(function (feature) {
                var lsoaCode = feature.properties.lsoa11cd;
                var imdScore = imdToLsoaCodeMap[lsoaCode];
                if (imdScore) {
                  var color = getColorFromIMDScore(imdScore);
                  var layer = L.geoJSON(feature, {
                    style: {
                      fillColor: color,
                      fillOpacity: 0.7,
                      color: "black",
                      weight: 1,
                    },
                  });
                  markers.addLayer(layer);

                  if (imdScore >= 1 && imdScore <= 10) {
                    scoreCounts[imdScore - 1]++;
                  }
                }
              });
			  
			  const mostDeprivedCount = countScores(imdData, filteredFeatures.map(feature => feature.properties.lsoa11cd));
			  const mostDeprivedData = ['Overall', 'Income', 'Employment', 'Education, Skills and Training', 'Health Deprivation and Disability', 'Crime', 'Barriers to Housing and Services', 'Living Environment'].map(category => mostDeprivedCount[`${category} Decile`] || 0);
			  setupHighcharts(mostDeprivedData, scoreCounts);
              
			  map.addLayer(markers);

              createHighchartsChart(scoreCounts);
            },
          };

          Papa.parse(csvData, csvOptions);
        })
        .catch(function (error) {
          console.log("Error fetching CSV:", error);
        });
    })
    .catch(function (error) {
      console.log("Error fetching GeoJSON:", error);
    });

	function countScores(imdData, lsoaCodes) {
	  const columns = ['Overall Decile', 'Income Decile', 'Employment Decile', 'Education, Skills and Training Decile', 'Health Deprivation and Disability Decile', 'Crime Decile', 'Barriers to Housing and Services Decile', 'Living Environment Decile'];
	  const mostDeprivedCount = {};

	  // Initialize mostDeprivedCount for each column
	  columns.forEach(column => mostDeprivedCount[column] = 0);

		imdData.forEach(function (row) {
			const lsoaCode = row["LSOA code"];
			if (lsoaCodes.includes(lsoaCode)) {
			  columns.forEach(column => {
				let score = row[column];
				if (score === undefined || score === null || score === '') {
				  console.log("No score data for column:", column);
				} else if (isNaN(score)) {
				  console.log("Non-numeric score data for column:", column, " Score:", score);
				} else {
				  score = parseInt(score);
				  if (score === 1) {
					mostDeprivedCount[column]++;
				  }
				}
			  });
			}
		});

	  // Debugging statement: print the mostDeprivedCount
	  console.log("mostDeprivedCount: ", mostDeprivedCount);

	  // Return the counts
	  return mostDeprivedCount;
	}

}

function createHighchartsChart(scoreCounts) {
  const countTotal = scoreCounts.reduce((acc, count) => acc + count, 0);
  console.log('Total Count:', countTotal);
  const percentages = scoreCounts.map(count => (count * 100) / countTotal);
  console.log('Percentages:', percentages);
  const chart = Highcharts.chart('chart1', {
    chart: {
      type: 'column',
      height: 275,
      spacingRight: 30
    },
    title: {
      text: 'Percentage of LSOAs in each decile'
    },
    xAxis: {
      categories: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      tickInterval: 1
    },
    yAxis: {
      title: {
        text: '',
      },
      labels: {
        format: '{value}%'
      },
      tickInterval: 5,
      min: 0
    },
    plotOptions: {
      series: {
        lineWidth: 2,
        dataLabels: {
          enabled: true,
          formatter: function () {
			return this.y.toFixed(0) + '%';
          }
        },
        colorByPoint: true,
        colors: ['#FF0000', '#FF4040', '#FF8080', '#FFC0C0', '#FFE0E0', '#E0FFE0', '#C0FFC0', '#80FF80', '#40FF40', '#00FF00']
      }
    },
    legend: {
      enabled: false
    },
    series: [{
      name: 'IMD Deciles',
      data: percentages
    }]
  });
}

function setupHighcharts(mostDeprivedData, scoreCounts) {
  const countTotal = scoreCounts.reduce((acc, count) => acc + count, 0);
  console.log('Total Count:', countTotal);
  const percentages2 = mostDeprivedData.map(count => (count * 100) / countTotal);
  console.log('Percentages:', percentages2);
  const chart = Highcharts.chart('chart2', {
	chart: {
	  type: 'column',
	  height: 275,
	  spacingRight: 30
	},
	title: {
	  text: 'Percentage of LSOAs in the most deprived decile'
	},
	xAxis: {
	  categories: ['Overall', 'Income', 'Employment', 'Education, Skills and Training', 'Health Deprivation and Disability', 'Crime', 'Barriers to Housing and Services', 'Living Environment'],
	  tickInterval: 1
	},
	yAxis: {
	  title: {
		text: '',
	  },
	  labels: {
		format: '{value}%'
	  },
	  tickInterval: 5,
	  min: 0
	},
	plotOptions: {
	  series: {
		lineWidth: 2,
		dataLabels: {
		  enabled: true,
		  formatter: function () {
			return this.y.toFixed(0) + '%';
		  }
		},
	  }
	},
	legend: {
	  enabled: false
	},
	series: [{
	  name: 'IMD Deciles',
	  data: percentages2,
	}]
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var domainDropdown = document.getElementById('domain');
  domainDropdown.addEventListener('change', fetchAndUpdateData);
  fetchAndUpdateData(); // Call it once to initialize the data
});

document.addEventListener('DOMContentLoaded', function () {
  var districtDropdown = document.getElementById('dropdown');
  districtDropdown.addEventListener('change', fetchAndUpdateData);
  fetchAndUpdateData(); // Call it once to initialize the data
});