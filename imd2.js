let parsedCsvData;
let geojsonData;
let imdToLsoaCodeMap;

var domainDropdown = document.getElementById('domain');
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
      color = "#20E020";  // Green
      break;
    default:
      color = "#000000";  // Black if the score is somehow out of range
  }

  return color;
}

function fetchCsvAndUpdateDropdown() {
  const csvUrl = "https://raw.githubusercontent.com/edshorthouse/imd/ccd6d4429247af3405ca7ef2dc743b8e35a84fdf/dropdownref.csv";

  // Fetch the CSV file
  fetch(csvUrl)
    .then(response => response.text())
    .then(data => {
      const parsedData = Papa.parse(data, { header: false });
      const items = parsedData.data.flat().map(item => item.trim()).filter(item => item !== '');

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

  const csvUrl = "https://raw.githubusercontent.com/edshorthouse/imd/ccd6d4429247af3405ca7ef2dc743b8e35a84fdf/dropdownref.csv";
  const geoJsonUrl = "https://raw.githubusercontent.com/edshorthouse/imdref/main/Lower_Super_Output_Area_(LSOA)_IMD_2019__(OSGB1936).geojson";
  const imdCsvUrl = "https://raw.githubusercontent.com/edshorthouse/imd/ffa1a9662916ffad606c716675328e09b0e6ae47/IMD2019.csv";
  const districtrank = "https://raw.githubusercontent.com/edshorthouse/imd/ccd6d4429247af3405ca7ef2dc743b8e35a84fdf/districtrank.csv";

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

						// Use a closure to capture the imdScore correctly
						var bindTooltipToLayer = function(score) {
							return function(feature, layer) {
								layer.bindTooltip("<span style='font-size: 0.85vw;'>Decile: <strong style='font-weight: 900;'>" + score + "</strong></span>");
							};
						};

						var layer = L.geoJSON(feature, {
							style: {
								fillColor: color,
								fillOpacity: 0.5,
								color: "black",
								weight: 1,
							},
							onEachFeature: bindTooltipToLayer(imdScore)
						});

						markers.addLayer(layer);

						if (imdScore >= 1 && imdScore <= 10) {
							scoreCounts[imdScore - 1]++;
						}
					}
				});
			  
			  const mostDeprivedCount = countScores(imdData, filteredFeatures.map(feature => feature.properties.lsoa11cd));
			  const mostDeprivedData = ['Overall', 'Income', 'Employment', 'Education, Skills and Training', 'Health Deprivation and Disability', 'Crime', 'Barriers to Housing and Services', 'Living Environment'].map(category => mostDeprivedCount[`${category} Decile`] || 0);
			  console.log("mostDeprivedData:", mostDeprivedData);
			  setupHighcharts(mostDeprivedData, scoreCounts);
              
			  map.addLayer(markers);

              createHighchartsChart(scoreCounts);
			  
			  const countTotal = scoreCounts.reduce((acc, count) => acc + count, 0);
              console.log('Total Count:', countTotal);
			  const percentages = scoreCounts.map(count => (count * 100) / countTotal);

			  districtRankChart(document.getElementById('container4').offsetHeight, districtrank, percentages);

			  hideLoadingOverlay();
			  
            },
          };

          Papa.parse(csvData, csvOptions);
        })
        .catch(function (error) {
          console.log("Error fetching CSV:", error);
		  hideLoadingOverlay();
        });
    })
    .catch(function (error) {
      console.log("Error fetching GeoJSON:", error);
	  hideLoadingOverlay();
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
  var dropdown = document.getElementById('dropdown');
  const countTotal = scoreCounts.reduce((acc, count) => acc + count, 0);
  console.log('Total Count:', countTotal);
  const percentages = scoreCounts.map(count => (count * 100) / countTotal);
  console.log('Percentages:', percentages);
  var containerHeight = document.getElementById('container2').offsetHeight;
  const chart = Highcharts.chart('chart1', {
    chart: {
        type: 'column',
        height: containerHeight * 95 / 100,
        spacingRight: 30
    },
    title: {
        text: 'Percentage of selected neighbourhoods (LSOAs) in each decile',
        style: {
            fontSize: '1vw'
        }
    },
    xAxis: {
        categories: ['1<br><br><b>Most Deprived</b>', '2', '3', '4', '5', '6', '7', '8', '9', '10<br><br><b>Least Deprived</b>'],
        tickInterval: 1,
        labels: {
			rotation: 0,
            style: {
                fontSize: '0.75vw'
            },
            step: 1,
            overflow: 'justify',
            crop: false,
        }
    },
    yAxis: {
        title: {
            text: '',
        },
        labels: {
            style: {
                fontSize: '0.75vw'
            },
            formatter: function () {
                return this.value.toFixed(0) + '%';
            }
        },
        tickInterval: 5,
        min: 0
    },
    tooltip: {
        formatter: function () {
            return this.y.toFixed(1) + '%';
        }
    },
    plotOptions: {
        series: {
            lineWidth: 2,
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '0.75vw'
                },
                formatter: function () {
                    return this.y.toFixed(0) + '%';
                }
            },
            colorByPoint: true,
            colors: ['#FF0000', '#FF4040', '#FF8080', '#FFC0C0', '#FFE0E0', '#E0FFE0', '#C0FFC0', '#80FF80', '#40FF40', '#20E020'],
			borderWidth: 2, // Change to adjust the border width
			borderColor: 'black' // Change to adjust the border color
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

let lowestValue;
let lowestCategory;

function setupHighcharts(domainDropdown) {
    var dropdown = document.getElementById('dropdown');
    var selectedOption = dropdown.value.trim();
    const categories = ['Overall', 'Income', 'Employment', 'Education, Skills and Training', 'Health Deprivation and Disability', 'Crime', 'Barriers to Housing and Services', 'Living Environment'];
    const districtrank = "https://raw.githubusercontent.com/edshorthouse/imd/ccd6d4429247af3405ca7ef2dc743b8e35a84fdf/districtrank.csv";
    
    // Helper function to interpolate between two RGB colors
    function interpolateColor(color1, color2, fraction) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);

        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * fraction).toString(16).padStart(2, '0');
        const g = Math.round(g1 + (g2 - g1) * fraction).toString(16).padStart(2, '0');
        const b = Math.round(b1 + (b2 - b1) * fraction).toString(16).padStart(2, '0');

        return `#${r}${g}${b}`;
    }

    // Helper function to determine the color of a data point
    function determineColor(value) {
        const red = "#FF0000";
        const yellow = "#FFFF00";
        const green = "#00FF00";
        
        if (value <= 31.7) {
            return red;
        } else if (value <= 158.5) {
            const fraction = (value - 31.7) / (158.5 - 31.7);
            return interpolateColor(red, yellow, fraction);
        } else if (value <= 285.3) {
            const fraction = (value - 158.5) / (285.3 - 158.5);
            return interpolateColor(yellow, green, fraction);
        } else {
            return green;
        }
    }

    fetch(districtrank)
    .then(response => response.text())
    .then(csvString => {
        Papa.parse(districtrank, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                const rows = results.data;
                const districtData = rows.find(row => row["District"] === selectedOption);

                if (!districtData) {
                    throw new Error("No match found for the selected option in the CSV data.");
                }

				const rawValues = categories.map((category, index) => districtData[category + " Decile"] || 0);
				const dataValues = rawValues.map((val, index) => {
					return {
						y: val,
						color: determineColor(val),
						category: categories[index]
					};
				});
				
                console.log('Data Values:', dataValues);
				
				let lowestValueItem = dataValues.reduce((min, item) => (item.y < min.y ? item : min), dataValues[0]);
				lowestValue = lowestValueItem.y;
				lowestCategory = categories[dataValues.indexOf(lowestValueItem)];
				
				console.log('Lowest Value:', lowestValue);
				console.log('Lowest Category:', lowestCategory);

                var containerHeight = document.getElementById('container2').offsetHeight;

                const chart = Highcharts.chart('chart2', {
                    chart: {
                      type: 'column',
                      height: containerHeight * 95 / 100,
                      spacingRight: 30
                    },
                    title: {
                      text: 'District National Rank for each IMD domain',
                      style: {
                        fontSize: '1vw'
                      }
                    },
                    xAxis: {
                      categories: categories,
                      tickInterval: 1,
                      labels: {
                        style: {
                          fontSize: '0.75vw'
                        }
                      }
                    },
                    yAxis: {
                      title: {
                        text: 'National Rank (1 = the most deprived)',
                        style: {
                          fontSize: '0.73vw'
                        }
                      },
                      labels: {
                        style: {
                          fontSize: '0.75vw'
                        },
                        formatter: function () {
                          return this.value.toFixed(0);
                        }
                      },
					  tickInterval: 50,
                      min: 0,
                      max: 317
                    },
                    tooltip: {
                      formatter: function () {
                        return this.y.toFixed(0);
                      }
                    },
                    plotOptions: {
                      series: {
                        lineWidth: 2,
                        dataLabels: {
                          enabled: true,
                          style: {
                            fontSize: '0.75vw'
                          },
                          formatter: function () {
                            return this.y.toFixed(0);
                          }
                        },
						colorByPoint: true,
						borderWidth: 2, // Change to adjust the border width
						borderColor: 'black' // Change to adjust the border color
					  }
                    },
                    legend: {
                      enabled: false
                    },		
                    series: [{
                        name: 'IMD Deciles',
                        data: dataValues
                    }]
                });
            }
        });
    })
    .catch(error => {
        console.error("Error fetching CSV:", error);
    });
}

function districtRankChart(containerHeight2, districtrank, percentages) {
    var domainDropdown = document.getElementById('domain');
    var selectedDomain = domainDropdown.value.trim();
    var dropdown = document.getElementById('dropdown');
    var selectedOption = dropdown.value.trim();
    
    Papa.parse(districtrank, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            let rankValue;
			let rankValue1;
            const rows = results.data;

			for (let i = 0; i < rows.length; i++) {
				let rowData = rows[i];

				if (rowData["District"] === selectedOption) {
					let rawRankValue = rowData[selectedDomain];
					console.log("Found district:", rowData["District"]);
					console.log("Value for domain:", rawRankValue);

					rankValue1 = parseFloat(rawRankValue);
					rankValue = rankValue1/317*100;

					if (isNaN(rankValue)) {
						throw new Error(`The value for district "${selectedOption}" in the domain "${selectedDomain}" is not a valid number: ${rawRankValue}`);
					}

					break;  // Exit the loop once the value is found
				}
			}

            if (rankValue === undefined) {
                throw new Error("No match found for the selected option in the CSV data.");
            }

            console.log("Rank Value:", rankValue);

            Highcharts.chart('container4', {
                chart: {
                    type: 'solidgauge',
                    height: containerHeight2,
                },
                title: {
                    text: 'District National Rank',
					  style: {
                        fontSize: '1vw'
                      }
                },
                pane: {
                    startAngle: -90,
                    endAngle: 90,
                    background: {
                        backgroundColor: '#EEE',
                        innerRadius: '60%',
                        outerRadius: '100%',
                        shape: 'arc'
                    }
                },
                tooltip: {
                    enabled: false
                },
                yAxis: {
                    stops: [
                        [0.1, '#FF0000'],
                        [0.5, '#FFFF00'],
                        [0.9, '#00FF00']
                    ],
                    lineWidth: 0,
                    tickAmount: 0,
                    title: {
                        text: '',
                        y: 16
                    },
                    min: 1,
                    max: 100,
                    labels: {
                        y: 1000
                    }
                },
                credits: {
                    enabled: false
				},
				plotOptions: {
					solidgauge: {
						borderColor: 'black',
						borderWidth: 2 // Adjust the border width to your liking
					}
				},
				series: [{
					name: 'Rank',
					data: [rankValue],
					dataLabels: {
						formatter: function() {
							return '<div style="text-align:centre"><span style="font-size:1.25vw;color:black">' + (this.y * 317 / 100).toFixed(0) + '</span><br/><span style="font-size:0.8vw;color:silver">Rank</span></div>';
						}
					}
				}]
            });
			updateTextContent(selectedOption, rankValue1, rankValue, selectedDomain, percentages);
        }
    });
}

function updateTextContent(selectedValue, rankValue1, rankValue, selectedDomain, percentages) {
	var textbox = document.getElementById("container3");
	var selectedDomain = domainDropdown.value.trim();
	selectedDomain = selectedDomain.replace(" Decile", "").trim();
	
	let x;

	if (rankValue < 10) {
		x = "10% most";
	} else if (rankValue >= 10 && rankValue < 20) {
		x = "20% most";
	} else if (rankValue >= 20 && rankValue < 30) {
		x = "30% most";
	} else if (rankValue >= 30 && rankValue < 40) {
		x = "40% most";
	} else if (rankValue >= 40 && rankValue < 50) {
		x = "50% most";
	} else if (rankValue >= 50 && rankValue < 60) {
		x = "50% least";
	} else if (rankValue >= 60 && rankValue < 70) {
		x = "40% least";
	} else if (rankValue >= 70 && rankValue < 80) {
		x = "30% least";
	} else if (rankValue >= 80 && rankValue < 90) {
		x = "20% least";
	} else if (rankValue >= 90) {
		x = "10% least";
	}
	
	y1 = (typeof y1 === "undefined") ? 0 : percentages[0];
	y10 = (typeof y10 === "undefined") ? 0 : percentages[9];
	
	var textContent = `
		<ul class="custom-bullet-list">
			<li><b>${selectedValue}</b> is ranked <b>${rankValue1}</b> out of 317 local authority districts; where 1 is the most deprived district in England. This is using the average score across all neighbourhoods for the <b>${selectedDomain}</b> domain. </li>
			<li>This is amongst the <b>${x} deprived</b> districts in England for the <b>${selectedDomain}</b> domain.</li>
			<li>The decile view below shows that, for the <b>${selectedDomain}</b> domain, <b>${Number(y1).toFixed(0)}%</b> of the neighbourhoods in <b>${selectedValue}</b> are amongst the 10% most deprived neighbourhoods in England, and <b>${Number(y10).toFixed(0)}%</b> of the neighbourhoods in <b>${selectedValue}</b> are amongst the 10% least deprived neighbourhoods in England.</li>
			<li>The domain view shows the District National Rank of <b>${selectedValue}</b> across each of the IMD domains. The domains with a lower rank could potentially be highlighted as priorities for improvement locally. </li>
		</ul>
		`;

	textbox.innerHTML = textContent;
}

document.addEventListener('DOMContentLoaded', function () {
  var domainDropdown = document.getElementById('domain');
  domainDropdown.addEventListener('change', function() {
    showLoadingOverlay();
    fetchAndUpdateData();
  });

  var districtDropdown = document.getElementById('dropdown');
  districtDropdown.addEventListener('change', function() {
    showLoadingOverlay();
    fetchAndUpdateData();
  });

  // Assuming fetchAndUpdateData() is asynchronous, you'll want to hide the loading overlay after the data has been fetched.
  fetchAndUpdateData().then(() => {
    hideLoadingOverlay();
  });

  dropdown.addEventListener("change", function () {
    showLoadingOverlay();
    var selectedValue = dropdown.value.trim();
    if (domainDropdown && domainDropdown.value) {
      var selectedDomain = domainDropdown.value.trim();
    } else {
      console.error('domain is undefined or has no value');
    }

    let rankValue = 'someValue';
    const countTotal = scoreCounts.reduce((acc, count) => acc + count, 0);
    console.log('Total Count:', countTotal);
    const percentages = scoreCounts.map(count => (count * 100) / countTotal);

    updateTextContent(selectedValue, rankValue1, rankValue, selectedDomain, percentages);
    hideLoadingOverlay();
  });

  updateTextContent("Adur");
});

$(document).ready(function() {
  $('#top3 .tabLabel a').click(function(e) {
    e.preventDefault();
    showLoadingOverlay();

    $('#container2 > .container > div').hide();
    $($(this).attr('href')).show();

    hideLoadingOverlay();
  });
});

function showLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'none';
}