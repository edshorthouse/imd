import { scoreCounts } from 'imd.js';

var Count1 = scoreCounts[0];
var Count2 = scoreCounts[1];
var Count3 = scoreCounts[2];
var Count4 = scoreCounts[3];
var Count5 = scoreCounts[4];
var Count6 = scoreCounts[5];
var Count7 = scoreCounts[6];
var Count8 = scoreCounts[7];
var Count9 = scoreCounts[8];
var Count10 = scoreCounts[9];

$(function () { 

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
                        return this.y + '%';
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
			name: 'Business Units',
			data: [Count1, Count2, Count3, Count4, Count5, Count6, Count7, Count8, Count9, Count10]
		}]
	});
});