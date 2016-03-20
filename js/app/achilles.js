(function () {
	curl([
		"jquery",
		"d3",
		"knockout",
		"common",
		"app/reports",
		"bootstrap",
		"d3/tip"
	], function ($, d3, ko, common, reports) {
		function summaryViewModel() {
			var self = this;

			self.dashboardData = ko.observable();
			self.conditionsData = ko.observable();

			self.personData = ko.observable();
			self.observationPeriodsData = ko.observable();

            self.studyData = ko.observable();
            self.studyDemographicsData = ko.observable();
            self.studyDataDensityData = ko.observable();
            self.biobankInventoryData = ko.observable();

//            self.studyAdverseEventData = ko.observable();
//            self.studyConcomitantMedicationData = ko.observable();

			self.datasource = ko.observable({
				name: 'loading...'
			});
			self.datasources = [];

			self.formatSI = function (d, p) {
				if (d < 1) {
					return d3.round(d, p);
				}
				var prefix = d3.formatPrefix(d);
				return d3.round(prefix.scale(d), p) + prefix.symbol;
			}

			self.loadDashboard = function () {
				$.ajax({
					type: "GET",
					url: getUrlFromData(self.datasource(), "dashboard"),
					contentType: "application/json; charset=utf-8",
				}).done(function (result) {
					result.SUMMARY = common.dataframeToArray(result.SUMMARY);
					result.SUMMARY.forEach(function (d, i, ar) {
						if (!isNaN(d.ATTRIBUTE_VALUE))
							d.ATTRIBUTE_VALUE = self.formatSI(d.ATTRIBUTE_VALUE, 2);
					});
					self.dashboardData(result);
				});
			}

			self.loadObservationPeriods = function () {
				$.ajax({
					type: "GET",
					url: getUrlFromData(self.datasource(), "observationperiod"),
					contentType: "application/json; charset=utf-8",
				}).done(function (result) {
					self.observationPeriodsData(result);
				});
			}

			self.loadPerson = function () {
				$.ajax({
					type: "GET",
					url: getUrlFromData(self.datasource(), "person"),
					contentType: "application/json; charset=utf-8",
				}).done(function (result) {

					result.SUMMARY = common.dataframeToArray(result.SUMMARY);
					result.SUMMARY.forEach(function (d, i, ar) {
						if (!isNaN(d.ATTRIBUTE_VALUE))
							d.ATTRIBUTE_VALUE = self.formatSI(d.ATTRIBUTE_VALUE, 2);
					});
					self.personData(result);
				});
			}

			self.loadConditions = function (folder) {
				$.ajax({
					type: "GET",
					url: getUrlFromData(self.datasource(), "treemap_path"),
					contentType: "application/json; charset=utf-8",
					success: function (data) {
						self.conditionsData(data);
					}
				});
			}

            self.loadStudy = function () {
                $.ajax({
                    type: "GET",
                    url: getUrlFromData(self.datasource(), "study"),
                    contentType: "application/json; charset=utf-8",
                }).done(function (result) {
                    self.studyData(result);
                });
            }

            self.loadStudyDemographics = function () {
                $.ajax({
                    type: "GET",
                    url: getUrlFromData(self.datasource(), "studydemographics"),
                    contentType: "application/json; charset=utf-8",
                }).done(function (result) {
                    self.studyDemographicsData(result);
                });
            }

            self.loadStudyDataDensity = function () {
                $.ajax({
                    type: "GET",
                    url: getUrlFromData(self.datasource(), "studydatadensity"),
                    contentType: "application/json; charset=utf-8",
                }).done(function (result) {
                    self.studyDataDensityData(result);
                });
            }

            self.loadBiobankInventory = function () {
                $.ajax({
                    type: "GET",
                    url: getUrlFromData(self.datasource(), "biobankinventory"),
                    contentType: "application/json; charset=utf-8",
                }).done(function (result) {
                    self.biobankInventoryData(result);
                });
            }
		}

		var viewModel = new summaryViewModel();
		page_vm = viewModel;

		viewModel.conditionsData.subscribe(function (newData) {
			updateConditions(newData);
		});

		viewModel.personData.subscribe(function (newData) {
			updatePerson(newData);
		});
		
		viewModel.observationPeriodsData.subscribe(function (newData) {
			updateObservationPeriods(newData);
		});

		viewModel.dashboardData.subscribe(function (newData) {
			updateDashboard(newData);
		});

        viewModel.studyData.subscribe(function (newData) {
            updateStudy(newData);
        });

        viewModel.studyDemographicsData.subscribe(function (newData) {
            updateStudyDemographics(newData);
        });

        viewModel.studyDataDensityData.subscribe(function (newData) {
            updateStudyDataDensity(newData);
        });

        viewModel.biobankInventoryData.subscribe(function (newData) {
            updateBiobankInventory(newData);
        });

        function updateDashboard(data) {
			var result = data;

			curl(["jnj/chart", "common"], function (jnj_chart, common) {
				d3.selectAll("#reportDashboard #genderPie svg").remove();
				genderDonut = new jnj_chart.donut();
				genderDonut.render(common.mapConceptData(result.GENDER_DATA), "#reportDashboard #genderPie", 260, 100, {
					colors: d3.scale.ordinal()
						.domain([8507, 8551, 8532])
						.range(["#1f77b4", " #CCC", "#ff7f0e"]),
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					}
				});

				d3.selectAll("#reportDashboard #ageatfirstobservation svg").remove();
				var ageAtFirstObservationData = common.mapHistogram(result.AGE_AT_FIRST_OBSERVATION_HISTOGRAM)
				var ageAtFirstObservationHistogram = new jnj_chart.histogram();
				ageAtFirstObservationHistogram.render(ageAtFirstObservationData, "#reportDashboard #ageatfirstobservation", 460, 195, {
					xFormat: d3.format('d'),
					xLabel: 'Age',
					yLabel: 'People'
				});

				d3.selectAll("#reportDashboard #cumulativeobservation svg").remove();
				var cumulativeObservationLine = new jnj_chart.line();
				var cumulativeData = common.normalizeDataframe(result.CUMULATIVE_DURATION).X_LENGTH_OF_OBSERVATION
					.map(function (d, i) {
						var item = {
							xValue: this.X_LENGTH_OF_OBSERVATION[i],
							yValue: this.Y_PERCENT_PERSONS[i]
						};
						return item;
					}, result.CUMULATIVE_DURATION);

				var cumulativeObservationXLabel = 'Days';
				if (cumulativeData.length > 0) {
					if (cumulativeData.slice(-1)[0].xValue - cumulativeData[0].xValue > 1000) {
						// convert x data to years
						cumulativeData.forEach(function (d) {
							d.xValue = d.xValue / 365.25;
						});
						cumulativeObservationXLabel = 'Years';
					}

					cumulativeObservationLine.render(cumulativeData, "#reportDashboard #cumulativeobservation", 550, 300, {
						yFormat: d3.format('0%'),
						interpolate: "step-before",
						xLabel: cumulativeObservationXLabel,
						yLabel: 'Percent of Population'
					});
				}

				var byMonthSeries = common.mapMonthYearDataToSeries(result.OBSERVED_BY_MONTH, {
					dateField: 'MONTH_YEAR',
					yValue: 'COUNT_VALUE',
					yPercent: 'PERCENT_VALUE'
				});

				d3.selectAll("#reportDashboard #oppeoplebymonthsingle svg").remove();
				var observationByMonthSingle = new jnj_chart.line();
				observationByMonthSingle.render(byMonthSeries, "#reportDashboard #oppeoplebymonthsingle", 550, 300, {
					xScale: d3.time.scale().domain(d3.extent(byMonthSeries[0].values, function (d) {
						return d.xValue;
					})),
					xFormat: d3.time.format("%m/%Y"),
					tickFormat: d3.time.format("%m/%Y"),
					tickPadding: 10,
					xLabel: "Date",
					yLabel: "People"
				});

			});
		}

        function updateObservationPeriods(data) {
            var result = data;

            curl(["jnj/chart", "common"], function (jnj_chart, common) {
                d3.selectAll("#reportObservationPeriods #agebygender svg").remove();
                var agegenderboxplot = new jnj_chart.boxplot();
                var agData = result.AGE_BY_GENDER.CATEGORY
                    .map(function (d, i) {
                        var item = {
                            Category: this.CATEGORY[i],
                            min: this.MIN_VALUE[i],
                            LIF: this.P10_VALUE[i],
                            q1: this.P25_VALUE[i],
                            median: this.MEDIAN_VALUE[i],
                            q3: this.P75_VALUE[i],
                            UIF: this.P90_VALUE[i],
                            max: this.MAX_VALUE[i]
                        };
                        return item;
                    }, result.AGE_BY_GENDER);
                agegenderboxplot.render(agData, "#reportObservationPeriods #agebygender", 235, 210, {
                    xLabel: "Gender",
                    yLabel: "Age"
                });

                d3.selectAll("#reportObservationPeriods #ageatfirstobservation svg").remove();
                var ageAtFirstObservationData = common.mapHistogram(result.AGE_AT_FIRST_OBSERVATION_HISTOGRAM);
                var ageAtFirstObservationHistogram = new jnj_chart.histogram();
                ageAtFirstObservationHistogram.render(ageAtFirstObservationData, "#reportObservationPeriods #ageatfirstobservation", 460, 195, {
                    xFormat: d3.format('d'),
                    xLabel: 'Age',
                    yLabel: 'People'
                });

                d3.selectAll("#reportObservationPeriods #observationlength svg").remove();
                result.OBSERVATION_LENGTH_HISTOGRAM.DATA = common.normalizeDataframe(result.OBSERVATION_LENGTH_HISTOGRAM.DATA)
                var observationLengthData = common.mapHistogram(result.OBSERVATION_LENGTH_HISTOGRAM);
                var observationLengthXLabel = 'Days';
                if (observationLengthData.length > 0) {
                    if (observationLengthData[observationLengthData.length - 1].x - observationLengthData[0].x > 1000) {
                        observationLengthData.forEach(function (d) {
                            d.x = d.x / 365.25;
                            d.dx = d.dx / 365.25;
                        });
                        observationLengthXLabel = 'Years';
                    }
                }
                var observationLengthHistogram = new jnj_chart.histogram();
                observationLengthHistogram.render(observationLengthData, "#reportObservationPeriods #observationlength", 460, 195, {
                    xLabel: observationLengthXLabel,
                    yLabel: 'People'
                });


                d3.selectAll("#reportObservationPeriods #cumulativeobservation svg").remove();
                var cumulativeObservationLine = new jnj_chart.line();
                var cumulativeData = common.normalizeDataframe(result.CUMULATIVE_DURATION).X_LENGTH_OF_OBSERVATION
                    .map(function (d, i) {
                        var item = {
                            xValue: this.X_LENGTH_OF_OBSERVATION[i],
                            yValue: this.Y_PERCENT_PERSONS[i]
                        };
                        return item;
                    }, result.CUMULATIVE_DURATION);

                var cumulativeObservationXLabel = 'Days';
                if (cumulativeData.length > 0) {
                    if (cumulativeData.slice(-1)[0].xValue - cumulativeData[0].xValue > 1000) {
                        // convert x data to years
                        cumulativeData.forEach(function (d) {
                            d.xValue = d.xValue / 365.25;
                        });
                        cumulativeObservationXLabel = 'Years';
                    }
                }

                cumulativeObservationLine.render(cumulativeData, "#reportObservationPeriods #cumulativeobservation", 450, 260, {
                    yFormat: d3.format('0%'),
                    interpolate: "step-before",
                    xLabel: cumulativeObservationXLabel,
                    yLabel: 'Percent of Population'
                });

                d3.selectAll("#reportObservationPeriods #opbygender svg").remove();
                var opbygenderboxplot = new jnj_chart.boxplot();
                result.OBSERVATION_PERIOD_LENGTH_BY_GENDER = common.normalizeDataframe(result.OBSERVATION_PERIOD_LENGTH_BY_GENDER);
                var opgData = result.OBSERVATION_PERIOD_LENGTH_BY_GENDER.CATEGORY
                    .map(function (d, i) {
                        var item = {
                            Category: this.CATEGORY[i],
                            min: this.MIN_VALUE[i],
                            LIF: this.P10_VALUE[i],
                            q1: this.P25_VALUE[i],
                            median: this.MEDIAN_VALUE[i],
                            q3: this.P75_VALUE[i],
                            UIF: this.P90_VALUE[i],
                            max: this.MAX_VALUE[i]
                        };
                        return item;
                    }, result.OBSERVATION_PERIOD_LENGTH_BY_GENDER);

                var opgDataYlabel = 'Days';
                var opgDataMinY = d3.min(opgData, function (d) {
                    return d.min;
                });
                var opgDataMaxY = d3.max(opgData, function (d) {
                    return d.max;
                });
                if ((opgDataMaxY - opgDataMinY) > 1000) {
                    opgData.forEach(function (d) {
                        d.min = d.min / 365.25;
                        d.LIF = d.LIF / 365.25;
                        d.q1 = d.q1 / 365.25;
                        d.median = d.median / 365.25;
                        d.q3 = d.q3 / 365.25;
                        d.UIF = d.UIF / 365.25;
                        d.max = d.max / 365.25;
                    });
                    opgDataYlabel = 'Years';
                }

                opbygenderboxplot.render(opgData, "#reportObservationPeriods #opbygender", 235, 210, {
                    xLabel: 'Gender',
                    yLabel: opgDataYlabel
                });

                d3.selectAll("#reportObservationPeriods #opbyage svg").remove();
                var opbyageboxplot = new jnj_chart.boxplot();
                result.OBSERVATION_PERIOD_LENGTH_BY_AGE = common.normalizeDataframe(result.OBSERVATION_PERIOD_LENGTH_BY_AGE);
                var opaData = result.OBSERVATION_PERIOD_LENGTH_BY_AGE.CATEGORY
                    .map(function (d, i) {
                        var item = {
                            Category: this.CATEGORY[i],
                            min: this.MIN_VALUE[i],
                            LIF: this.P10_VALUE[i],
                            q1: this.P25_VALUE[i],
                            median: this.MEDIAN_VALUE[i],
                            q3: this.P75_VALUE[i],
                            UIF: this.P90_VALUE[i],
                            max: this.MAX_VALUE[i]
                        };
                        return item;
                    }, result.OBSERVATION_PERIOD_LENGTH_BY_AGE);

                var opaDataYlabel = 'Days';
                var opaDataMinY = d3.min(opaData, function (d) {
                    return d.min;
                });
                var opaDataMaxY = d3.max(opaData, function (d) {
                    return d.max;
                });
                if ((opaDataMaxY - opaDataMinY) > 1000) {
                    opaData.forEach(function (d) {
                        d.min = d.min / 365.25;
                        d.LIF = d.LIF / 365.25;
                        d.q1 = d.q1 / 365.25;
                        d.median = d.median / 365.25;
                        d.q3 = d.q3 / 365.25;
                        d.UIF = d.UIF / 365.25;
                        d.max = d.max / 365.25;
                    });
                    opaDataYlabel = 'Years';
                }

                opbyageboxplot.render(opaData, "#reportObservationPeriods #opbyage", 450, 260, {
                    xLabel: 'Age Decile',
                    yLabel: opaDataYlabel
                });

                d3.selectAll("#reportObservationPeriods #oppeoplebyyear svg").remove();
                var observationLengthHistogram = new jnj_chart.histogram();
                observationLengthHistogram.render(common.mapHistogram(result.OBSERVED_BY_YEAR_HISTOGRAM), "#reportObservationPeriods #oppeoplebyyear", 460, 195, {
                    xFormat: d3.format('d'),
                    xLabel: 'Year',
                    yLabel: 'People'
                });

                var byMonthSeries = common.mapMonthYearDataToSeries(result.OBSERVED_BY_MONTH, {
                    dateField: 'MONTH_YEAR',
                    yValue: 'COUNT_VALUE',
                    yPercent: 'PERCENT_VALUE'
                });

                d3.selectAll("#reportObservationPeriods #oppeoplebymonthsingle svg").remove();
                var observationByMonthSingle = new jnj_chart.line();
                observationByMonthSingle.render(byMonthSeries, "#reportObservationPeriods #oppeoplebymonthsingle", 900, 250, {
                    xScale: d3.time.scale().domain(d3.extent(byMonthSeries[0].values, function (d) {
                        return d.xValue;
                    })),
                    xFormat: d3.time.format("%m/%Y"),
                    tickFormat: d3.time.format("%m/%Y"),
                    ticks: 10,
                    xLabel: "Date",
                    yLabel: "People"
                });

                d3.selectAll("#reportObservationPeriods #opperperson svg").remove();
                raceDonut = new jnj_chart.donut();
                raceDonut.render(common.mapConceptData(result.PERSON_PERIODS_DATA), "#reportObservationPeriods #opperperson", 255, 230, {
                    margin: {
                        top: 5,
                        bottom: 10,
                        right: 50,
                        left: 10
                    }
                });
            });
        }

		function updatePerson(data) {
			var result = data;

			curl(["jnj/chart", "common"], function (jnj_chart, common) {
				d3.selectAll("#reportPerson #genderPie svg").remove();
				genderDonut = new jnj_chart.donut();
				genderDonut.render(common.mapConceptData(result.GENDER_DATA), "#reportPerson #genderPie", 260, 130, {
					colors: d3.scale.ordinal()
						.domain([8507, 8551, 8532])
						.range(["#1f77b4", " #CCC", "#ff7f0e"]),
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					}

				});

				d3.selectAll("#reportPerson #raceTypePie svg").remove();
				raceDonut = new jnj_chart.donut();
				raceDonut.render(common.mapConceptData(result.RACE_DATA), "#reportPerson #raceTypePie", 260, 130, {
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					}
				});

				d3.selectAll("#reportPerson #ethnicityTypePie svg").remove();
				raceDonut = new jnj_chart.donut();
				raceDonut.render(common.mapConceptData(result.ETHNICITY_DATA), "#reportPerson #ethnicityTypePie", 260, 130, {
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					}
				});

				d3.selectAll("#reportPerson #birthyearhist svg").remove();
				var yearHistogram = new jnj_chart.histogram();
				yearHistogram.render(common.mapHistogram(result.BIRTH_YEAR_HISTOGRAM), "#reportPerson #birthyearhist", 460, 195, {
					xFormat: d3.format('d'),
					xLabel: 'Year',
					yLabel: 'People'
				});
			});
		}

        function updateStudy(data) {
            var result = data;

            curl(["jnj/chart", "common"], function (jnj_chart, common) {

                // Study Location
                d3.selectAll("#reportStudy #studylocation svg").remove();
                var studyLocationBarChart = new jnj_chart.barchart();

                var totalLoc = new common.getTotalCount(result.STUDY_LOCATION.STUDY_COUNT);

                var agData = result.STUDY_LOCATION.STATE
                    .map( function(d, i) {
                        var item = {
                            State: this.STATE[i] + " (" + this.COUNTRY[i] + ")",
                            Count: 100.0 * this.STUDY_COUNT[i] / totalLoc[1]
//                            Count: this.STUDY_COUNT[i]
                        };
                        return item;
                    }, result.STUDY_LOCATION);

                studyLocationBarChart.render(agData, "#reportStudy #studylocation", 900, 250, {
                    label: "State",
                    value: "Count",
                    rotate: 30,
                    textAnchor: "start",
                    bottom: 50,
                    showLabels: false,
                    labelFontSize: '7px',
                    textFontSize: '7px',
                    yLable: 'Percentage (%)',
                    barPaddingFactor: 10.0  // default 1.0
                });

                // Study Theraputic Area
                d3.selectAll("#reportStudy #studytheraputicarea svg").remove();
                var totalTA = new common.getTotalCount(result.THERAPUTIC_AREA.STUDY_COUNT);
                var theraputicAreaBarChart = new jnj_chart.barchart();
                var agData = result.THERAPUTIC_AREA.TA_NAME
                    .map( function(d, i) {
                        var item = {
                            Theraputic_Area: this.TA_NAME[i],
//                            Count: 100 * this.STUDY_COUNT[i]/30.0
                            Count: 100 * this.STUDY_COUNT[i]/ totalTA[1]
                        };
                        return item;
                    }, result.THERAPUTIC_AREA);

                theraputicAreaBarChart.render(agData, "#reportStudy #studytheraputicarea", 500, 250, {
                    label: "Theraputic_Area",
                    value: "Count",
                    //rotate: 30,
                    //textAnchor: "start",
                    //bottom: 50,
                    showLabels: false,
                    labelFontSize: '10px',
                    textFontSize: '10px',
                    yLable: 'Percentage (%)',
                    barPaddingFactor: 1.5
                });


                // Study BioBank Samples
                d3.selectAll("#reportStudy #studybiobanksample svg").remove();
                var biobankSampleBarChart = new jnj_chart.barchart();
                var totalSamples = new common.getTotalCount(result.BIOBANK_SAMPLES.SAMPLE_COUNT);
                var agData = result.BIOBANK_SAMPLES.SAMPLE_TYPE
                    .map( function(d, i) {
                        var item = {
                            sample_type: this.SAMPLE_TYPE[i],
//                            sample_count: this.SAMPLE_COUNT[i]
                            sample_count: 100 * this.SAMPLE_COUNT[i] / totalSamples[1]
                        };
                        return item;
                    }, result.BIOBANK_SAMPLES);

                biobankSampleBarChart.render(agData, "#reportStudy #studybiobanksample", 500, 250, {
                    label: "sample_type",
                    value: "sample_count",
                    //rotate: 30,
                    //textAnchor: "start",
                    //bottom: 50,
                    showLabels: false,
                    labelFontSize: '10px',
                    textFontSize: '12px',
                    barPaddingFactor: 1.5 ,
                    yLable: 'Percentage (%)'
                });


                // Study Phase
                d3.selectAll("#reportStudy #studyPhase svg").remove();
                studyPhaseDonut = new jnj_chart.donut();

                var studyPhase = new Array();
                if(result.STUDY_PHASE.STUDY_PHASE instanceof Array) {
                    studyPhase= result.STUDY_PHASE.STUDY_PHASE.map(function(d, i){
                        var item = {
                            id: i + 1,
                            label: this.STUDY_PHASE[i],
                            value: this.STUDY_COUNT[i]
                        };
                        return item;
                    }, result.STUDY_PHASE);
                }  else {
                    studyPhase[0] = {
                        id: 1,
                        label: result.STUDY_PHASE.STUDY_PHASE,
                        value: result.STUDY_PHASE.STUDY_COUNT
                    }
                }

                studyPhaseDonut.render(studyPhase, "#reportStudy #studyPhase", 260, 100, {
                    colors: d3.scale.ordinal()
                        .domain([1, 2, 3])
                        .range(["#1f77b4", " #CCC", "#ff7f0e"]),
                    //ir: 0,
                    margin: {
                        top: 5,
                        bottom: 10,
                        right: 150,
                        left: 10
                    }
                });


                // Study Type
                d3.selectAll("#reportStudy #studyType svg").remove();
                studyTypeDonut = new jnj_chart.donut();

                var studyType = new Array();
                if(result.STUDY_TYPE.STUDY_TYPE instanceof Array) {
                    studyType = result.STUDY_TYPE.STUDY_TYPE.map(function (d, i) {
                        var item = {
                            id: i+1,
                            label: this.STUDY_TYPE[i],
                            value: this.STUDY_COUNT[i]
                        };
                        return item;
                    }, result.STUDY_TYPE);
                } else {
                    studyType[0] = {
                        id: 1,
                        label: result.STUDY_TYPE.STUDY_TYPE,
                        value : result.STUDY_TYPE.STUDY_COUNT
                    };
                }

                studyTypeDonut.render(studyType, "#reportStudy #studyType", 260, 100, {
                    colors: d3.scale.ordinal()
                        .domain([1])
                        .range(["#1f77b4"]), //(["#1f77b4", " #CCC", "#ff7f0e"]),
                    //ir: 0,
                    margin: {
                        top: 5,
                        bottom: 10,
                        right: 150,
                        left: 10
                    }
                });

            });
        }

        function updateStudyDemographics(data) {
            var result = data;

            curl(["jnj/chart", "common"], function (jnj_chart, common) {

                // Gender Distribution
                d3.selectAll("#reportStudyDemographics #studyGender svg").remove();
                studyGenderDonut = new jnj_chart.donut();

                var studyGender = new Array();
                if(result.GENDER.SEX instanceof Array) {
                    studyType = result.GENDER.SEX.map(function (d, i) {
                        var item = {
                            id: i+1,
                            label: this.SEX[i],
                            value: this.SUBJECT_COUNT[i]
                        };
                        return item;
                    }, result.GENDER);
                } else {
                    studyType[0] = {
                        id: 1,
                        label: result.GENDER.SEX,
                        value : result.GENDER.SUBJECT_COUNT
                    };
                }

                studyGenderDonut.render(studyType, "#reportStudyDemographics #studyGender", 260, 100, {
                    colors: d3.scale.ordinal()
                        .domain([1, 2, 3])
                        .range(["#1f77b4", " #CCC", "#ff7f0e"]),
                    //ir: 0,
                    margin: {
                        top: 5,
                        bottom: 10,
                        right: 150,
                        left: 10
                    }
                });


                // Age Distribution
                d3.selectAll("#reportStudyDemographics #studyAge svg").remove();
                var studyAgeBarChart = new jnj_chart.barchart();
                var totalAC = new common.getTotalCount(result.AGE.AGE_COUNT);
                var agData = result.AGE.AGE
                    .map( function(d, i) {
                        var item = {
                            age: this.AGE[i],
//                            count: this.AGE_COUNT[i]
                            count: 100 * this.AGE_COUNT[i] / totalAC[1]
                        };
                        return item;
                    }, result.AGE);

                studyAgeBarChart.render(agData, "#reportStudyDemographics #studyAge", 900, 250, {
                    label: "age",
                    value: "count",
                    rotate: 30,
                    textAnchor: "start",
                    bottom: 50,
                    showLabels: false,
                    labelFontSize: '6px',
                    textFontSize: '6px',
                    barPaddingFactor: 40,
                    yLable: 'Percentage (%)'
                });


                // Race Distribution
                d3.selectAll("#reportStudyDemographics #studyRace svg").remove();
                var studyRaceBarChart = new jnj_chart.barchart();
                var totalRC = new common.getTotalCount(result.RACE.SUBJECT_COUNT);
                var agData = result.RACE.RACE
                    .map( function(d, i) {
                        var item = {
                            race: this.RACE[i],
//                            count: this.SUBJECT_COUNT[i]
                            count: 100 * this.SUBJECT_COUNT[i] / totalRC[1]
                        };
                        return item;
                    }, result.RACE);

                studyRaceBarChart.render(agData, "#reportStudyDemographics #studyRace", 900, 250, {
                    label: "race",
                    value: "count",
                    rotate: 30,
                    textAnchor: "start",
                    bottom: 90,
                    showLabels: false,
                    labelFontSize: '10px',
                    textFontSize: '10px',
                    barPaddingFactor: 5.0,
                    yLable: 'Percentage (%)'
                });

            });
        }

        function updateStudyDataDensity(data) {
            var result = data;

            curl(["jnj/chart", "common"], function (jnj_chart, common) {

                // total number of interventions
                d3.selectAll("#reportStudyDataDensity #studyTotalIntervention svg").remove();
                var studyTotalInterventionBarChart = new jnj_chart.barchart();
                var totalIC = new common.getTotalCount(result.TOTAL_INTERVENTIONS.RECORD_COUNT);
                var agData = result.TOTAL_INTERVENTIONS.EXPOSURE_NAME
                    .map( function(d, i) {
                        var item = {
                            intervention: this.EXPOSURE_NAME[i],
//                            count: this.RECORD_COUNT[i]
                            count: 100 * this.RECORD_COUNT[i] / totalIC[1]
                        };
                        return item;
                    }, result.TOTAL_INTERVENTIONS);

                studyTotalInterventionBarChart.render(agData, "#reportStudyDataDensity #studyTotalIntervention", 900, 250, {
                    label: "intervention",
                    value: "count",
                    rotate: 0,
                    textAnchor: "middle",
                    bottom: 20,
                    showLabels: false,
                    labelFontSize: '15px',
                    textFontSize: '15px',
                    barPaddingFactor: 3.0,
                    yLable: 'Percentage (%)'
                });


                // total number of lab tests
                d3.selectAll("#reportStudyDataDensity #studyTotalLabTest svg").remove();
                var studyTotalLabTestBarChart = new jnj_chart.barchart();
                var totalLTC = new common.getTotalCount(result.TOTAL_LAB_TESTS.RECORD_COUNT);
                var agData = result.TOTAL_LAB_TESTS.EXAMINATION_NAME
                    .map( function(d, i) {
                        var item = {
                            lab_test: this.EXAMINATION_NAME[i],
//                            count: this.RECORD_COUNT[i]
                            count: 100 * this.RECORD_COUNT[i] / totalLTC[1]
                        };
                        return item;
                    }, result.TOTAL_LAB_TESTS);

                studyTotalLabTestBarChart.render(agData, "#reportStudyDataDensity #studyTotalLabTest", 900, 250, {
                    label: "lab_test",
                    value: "count",
                    rotate: 0,
                    textAnchor: "middle",
                    bottom: 20,
                    showLabels: false,
                    labelFontSize: '15px',
                    textFontSize: '15px',
                    barPaddingFactor: 1.6,
                    yLable: 'Percentage (%)'
                });


            });
        }

        function updateBiobankInventory(data) {
            var result = data;

            curl(["jnj/chart", "common"], function (jnj_chart, common) {

                // SAMPLE STATUS
                d3.selectAll("#reportBiobankInventory #studySampleStatus svg").remove();

                var studySampleStatusDonut = new jnj_chart.donut();

                var studySampleStatus = new Array();
                if(result.SAMPLE_STATUS.SAMPLE_STATUS instanceof Array) {
                    studySampleStatus = result.SAMPLE_STATUS.SAMPLE_STATUS.map(function (d, i) {
                        var item = {
                            id: i+1,
                            label: this.SAMPLE_STATUS[i],
                            value: this.SAMPLE_COUNT[i]
                        };
                        return item;
                    }, result.SAMPLE_STATUS);
                } else {
                    studySampleStatus[0] = {
                        id: 1,
                        label: result.SAMPLE_STATUS.SAMPLE_STATUS,
                        value : result.SAMPLE_STATUS.SAMPLE_COUNT
                    };
                }

                studySampleStatusDonut.render(studySampleStatus, "#reportBiobankInventory #studySampleStatus", 260, 100, {
                    colors: d3.scale.ordinal()
                        .domain([1, 2, 3])
                        .range(["#1f77b4", " #CCC", "#ff7f0e"]),
                    //ir: 0,
                    margin: {
                        top: 5,
                        bottom: 10,
                        right: 150,
                        left: 10
                    }
                });


                // Sample Condition
                d3.selectAll("#reportBiobankInventory #studySampleCondition svg").remove();

                var studySampleConditionDonut = new jnj_chart.donut();

                var studySampleCondition = new Array();
                if(result.SAMPLE_CONDITION.SAMPLE_CONDITION instanceof Array) {
                    studySampleCondition = result.SAMPLE_CONDITION.SAMPLE_CONDITION.map(function (d, i) {
                        var item = {
                            id: i+1,
                            label: this.SAMPLE_CONDITION[i],
                            value: this.SAMPLE_COUNT[i]
                        };
                        return item;
                    }, result.SAMPLE_CONDITION);
                } else {
                    studySampleCondition[0] = {
                        id: 1,
                        label: result.SAMPLE_CONDITION.SAMPLE_CONDITION,
                        value : result.SAMPLE_CONDITION.SAMPLE_COUNT
                    };
                }

                studySampleConditionDonut.render(studySampleCondition, "#reportBiobankInventory #studySampleCondition", 260, 100, {
                    colors: d3.scale.ordinal()
                       .domain([1, 2, 3])
                       .range(["#1f77b4", " #CCC", "#ff7f0e"]),
                    //ir: 0,
                    margin: {
                        top: 5,
                        bottom: 10,
                        right: 150,
                        left: 10
                    }
                });

            });
        }

        curl(["knockout-amd-helpers"], function () {
			ko.amdTemplateEngine.defaultPath = "../templates";
			ko.applyBindings(viewModel);
		});

		curl(["sammy"], function (Sammy) {
			var app = Sammy(function () {
				this.get('#/:name/dashboard', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);
					viewModel.loadDashboard();
					$('#reportDashboard').show();
					report = 'dashboard';
				});

				this.get('#/:name/achillesheel', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.AchillesHeel.render(viewModel.datasource());
					$('#reportAchillesHeel').show();
					report = 'achillesheel';
				});

				this.get('#/:name/person', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);
					viewModel.loadPerson();
					$('#reportPerson').show();
					report = 'person';
				});

				this.get('#/:name/conditions', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.ConditionOccurrence.render(viewModel.datasource());
					$('#reportConditionOccurrences').show();
					report = 'conditions';
				});

				this.get('#/:name/conditioneras', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.ConditionEra.render(viewModel.datasource());
					$('#reportConditionEras').show();
					report = 'conditioneras';
				});

				this.get('#/:name/drugs', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.DrugExposure.render(viewModel.datasource());
					$('#reportDrugExposures').show();
					report = 'drugs';
				});

				this.get('#/:name/drugeras', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.DrugEra.render(viewModel.datasource());
					$('#reportDrugEras').show();
					report = 'drugeras';
				});

				this.get('#/:name/procedures', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.ProcedureOccurrence.render(viewModel.datasource());
					$('#reportProcedureOccurrences').show();
					report = 'procedures';
				});

				this.get('#/:name/observationperiods', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);
					viewModel.loadObservationPeriods();
					$('#reportObservationPeriods').show();
					report = 'observationperiods';
				});

				this.get('#/:name/datadensity', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.DataDensity.render(viewModel.datasource());
					$('#reportDataDensity').show();
					report = 'datadensity';
				});

				this.get('#/:name/observations', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.Observation.render(viewModel.datasource());
					$('#reportObservations').show();
					report = 'observations';
				});

				this.get('#/:name/visits', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.VisitOccurrence.render(viewModel.datasource());
					$('#reportVisitOccurrences').show();
					report = 'visits';
				});

				this.get('#/:name/death', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.Death.render(viewModel.datasource());
					$('#reportDeath').show();
					report = 'death';
				});

				this.get('#/:name/measurement', function (context) {
					$('.report').hide();
					viewModel.datasource(viewModel.datasources.filter(function (d) {
						return d.name == this.params['name'];
					}, this)[0]);

					reports.Measurement.render(viewModel.datasource());
					$('#reportMeasurement').show();
					report = 'measurement';
				});

                this.get('#/:name/study', function (context) {
                    $('.report').hide();
                    viewModel.datasource(viewModel.datasources.filter(function (d) {
                        return d.name == this.params['name'];
                    }, this)[0]);
                    viewModel.loadStudy();
                    $('#reportStudy').show();
                    report = 'study';
                });

                this.get('#/:name/studydemographics', function (context) {
                    $('.report').hide();
                    viewModel.datasource(viewModel.datasources.filter(function (d) {
                        return d.name == this.params['name'];
                    }, this)[0]);
                    viewModel.loadStudyDemographics();
                    $('#reportStudyDemographics').show();
                    report = 'studydemographics';
                });

                this.get('#/:name/studydatadensity', function (context) {
                    $('.report').hide();
                    viewModel.datasource(viewModel.datasources.filter(function (d) {
                        return d.name == this.params['name'];
                    }, this)[0]);
                    viewModel.loadStudyDataDensity();
                    $('#reportStudyDataDensity').show();
                    reports.StudyAdverseEvent.render(viewModel.datasource());
                    reports.StudyConcomitantMedication.render(viewModel.datasource());
                    report = 'studydatadensity';
                });

                this.get('#/:name/biobankinventory', function (context) {
                    $('.report').hide();
                    viewModel.datasource(viewModel.datasources.filter(function (d) {
                        return d.name == this.params['name'];
                    }, this)[0]);
                    viewModel.loadBiobankInventory();
                    $('#reportBiobankInventory').show();
                    report = 'biobankinventory';
                });

            });

			$(function () {
				$.ajax({
					cache: false,
					type: "GET",
					url: datasourcepath,
					contentType: "application/json; charset=utf-8"
				}).done(function (root) {
					viewModel.datasources = root.datasources;

					for (i = 0; i < root.datasources.length; i++) {
						$('#dropdown-datasources').append('<li onclick="setDatasource(' + i + ');">' + root.datasources[i].name + '</li>');
					}
					viewModel.datasource(viewModel.datasources[0]);
					app.run('#/' + viewModel.datasource().name + '/dashboard');
				});

			});
		});
	});
})();

var	simpledata = [
    "achillesheel",
    "condition_treemap",
    "conditionera_treemap",
    "dashboard",
    "datadensity",
    "death",
    "drug_treemap",
    "drugera_treemap",
    "measurement_treemap",
    "observation_treemap",
    "observationperiod",
    "person",
    "procedure_treemap",
    "visit_treemap",
    "study",
    "studydemographics",
    "studydatadensity",
    "adverse_event_treemap",
    "concomitant_medication_treemap",
    "biobankinventory"
];

var collectionFormats = {
	"conditioneras" : "condition_{id}.json",
	"conditions" 	: "condition_{id}.json",
	"drugeras"		: "drug_{id}.json",
	"drugs"			: "drug_{id}.json",
	"measurements" : "measurement_{id}.json",
	"observations" 	: "observation_{id}.json",
	"procedures"	: "procedure_{id}.json",
	"visits"		: "visit_{id}.json" ,
    "adverse_events"		: "adverse_events_{id}.json",
    "concomitant_medication"		: "concomitant_medication_{id}.json"
}

function getUrlFromData(datasource, name){
	
	if( datasource === undefined ){ 
		console.error("datasource is undefined.");
		return; 
	}
	if ( !collectionFormats.hasOwnProperty(name) && simpledata.indexOf(name) < 0 ){ 
		console.error("'" + name + "' not found in collectionFormats or simpledata.");
		return;
	}
	var parent = "";
	if( datasource.parentUrl !== undefined) parent += datasource.parentUrl+"/";
	var pth = "";
	
	if( datasource.map !== undefined){
		if(datasource.map[name] !== undefined){
			if(datasource.map[name].type !== undefined){
				switch(datasource.map[name].type){
					case 'folder':
					case 'collection':
						if(!collectionFormats.hasOwnProperty(name)){ return; }
						pth += parent + datasource.map[name].url;
						break;									
					case 'service':
					case 'file':
						if(simpledata.indexOf(name) < 0){ return; }
						pth += parent + datasource.map[name].url;
						break;
				}
			}
		}	
	}else if( datasource.url !== undefined){		
		pth += parent + datasource.url + "/" + name;
		if ( simpledata.indexOf(name) >= 0 ) pth += ".json";
	}else if ( datasource.folder !== undefined){
		pth += "data/" + datasource.folder + "/" + name;
		if ( simpledata.indexOf(name) >= 0 ) pth += ".json";
	}else{
		console.error("Could not construct path from map, datasource.url or datasource.folder");
		return;
	}
	
	return pth;
}

function getUrlFromDataCollection(datasource, name, id){
	
	if( datasource === undefined ) return;
	if ( !collectionFormats.hasOwnProperty(name) ) return;
	var parent = "";
	if( datasource.parentUrl !== undefined) parent += datasource.parentUrl+"/";
	var pth = "";
	
	if( datasource.map !== undefined){
		if(datasource.map[name] !== undefined){
			if(datasource.map[name].type !== undefined && (datasource.map[name].type === 'folder' || datasource.map[name].type === 'collection') ){
				if(!collectionFormats.hasOwnProperty(name)){ return; }
				pth += parent + datasource.map[name].url.replace("{id}", id);
			}
		}	
	}else if( datasource.url !== undefined){
		pth += parent+ datasource.url + "/" + name + "/" + collectionFormats[name].replace("{id}", id);
		if ( simpledata.indexOf(name) >= 0 ) pth += ".json";
	}else if ( datasource.folder !== undefined){
		pth += "data/" + datasource.folder + "/" + name + "/" + collectionFormats[name].replace("{id}", id);
	}
	
	return pth;
}



