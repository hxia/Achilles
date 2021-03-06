		(function () {
			define(["jquery", "d3", "jnj/chart", "common", "datatables", "datatables-colvis"], function ($, d3, jnj_chart, common) {
				var visit_occurrence = {};
				var threshold;
				var datatable;

				// bind to all matching elements upon creation
				$(document).on('click', '#visit_table tbody tr', function () {
					$('#visit_table tbody tr.selected').removeClass('selected');
					$(this).addClass('selected');
					id = datatable.data()[datatable.row(this)[0]].concept_id;
					concept_name = datatable.data()[datatable.row(this)[0]].visit_type_name;
					visit_occurrence.drilldown(id, concept_name);
				});

				$('#myTab a').click(function (e) {
					e.preventDefault();
					$(this).tab('show');
					$(window).trigger("resize");
				})

				visit_occurrence.drilldown = function (concept_id, concept_name) {
					$('.drilldown svg').remove();
					$('#visitDrilldownTitle').text(concept_name);
					$('#reportVisitOccurrencesDrilldown').removeClass('hidden');

					$.ajax({
						type: "GET",
						url: getUrlFromDataCollection(page_vm.datasource(), "visits", concept_id),
						success: function (data) {

							// render trellis
							trellisData = common.normalizeDataframe(data.PREVALENCE_BY_GENDER_AGE_YEAR);

							var allDeciles = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99"];
							var allSeries = ["MALE", "FEMALE"];
							var minYear = d3.min(trellisData.X_CALENDAR_YEAR),
								maxYear = d3.max(trellisData.X_CALENDAR_YEAR);

							var seriesInitializer = function (tName, sName, x, y) {
								return {
									TRELLIS_NAME: tName,
									SERIES_NAME: sName,
									X_CALENDAR_YEAR: x,
									Y_PREVALENCE_1000PP: y
								};
							}

							var nestByDecile = d3.nest()
								.key(function (d) {
									return d.TRELLIS_NAME;
								})
								.key(function (d) {
									return d.SERIES_NAME;
								})
								.sortValues(function (a, b) {
									return a.X_CALENDAR_YEAR - b.X_CALENDAR_YEAR;
								});

							// map data into chartable form
							var normalizedSeries = trellisData.TRELLIS_NAME.map(function (d, i) {
								var item = {};
								var container = this;
								d3.keys(container).forEach(function (p) {
									item[p] = container[p][i];
								});
								return item;
							}, trellisData);

							var dataByDecile = nestByDecile.entries(normalizedSeries);
							// fill in gaps
							var yearRange = d3.range(minYear, maxYear, 1);

							dataByDecile.forEach(function (trellis) {
								trellis.values.forEach(function (series) {
									series.values = yearRange.map(function (year) {
										yearData = series.values.filter(function (f) {
											return f.X_CALENDAR_YEAR == year;
										})[0] || seriesInitializer(trellis.key, series.key, year, 0);
										yearData.date = new Date(year, 0, 1);
										return yearData;
									})
								})
							});

							// create svg with range bands based on the trellis names
							var chart = new jnj_chart.trellisline();
							chart.render(dataByDecile, "#reportVisitOccurrences #trellisLinePlot", 1000, 300, {
								trellisSet: allDeciles,
								trellisLabel: "Age Decile",
								seriesLabel: "Year of Observation",
								yLabel: "Prevalence Per 1000 People",
								xFormat: d3.time.format("%m/%Y"),
								tickFormat: d3.time.format("%m/%Y"),
								yFormat: d3.format("0.2f"),
								tickPadding: 20,
								colors: d3.scale.ordinal()
									.domain(["MALE", "FEMALE"])
									.range(["#1f77b4", "#ff7f0e"])

							});

							// age at first diagnosis visualization
							var boxplot = new jnj_chart.boxplot();
							bpseries = [];
							bpdata = common.normalizeDataframe(data.AGE_AT_FIRST_OCCURRENCE);
							for (i = 0; i < bpdata.CATEGORY.length; i++) {
								bpseries.push({
									Category: bpdata.CATEGORY[i],
									min: bpdata.MIN_VALUE[i],
									max: bpdata.MAX_VALUE[i],
									median: bpdata.MEDIAN_VALUE[i],
									LIF: bpdata.P10_VALUE[i],
									q1: bpdata.P25_VALUE[i],
									q3: bpdata.P75_VALUE[i],
									UIF: bpdata.P90_VALUE[i]
								});
							}
							boxplot.render(bpseries, "#reportVisitOccurrences #ageAtFirstOccurrence", 500, 300, {
								xLabel: 'Gender',
								yLabel: 'Age at First Occurrence'
							});

							// visits by type distribution visualization
							var boxplot = new jnj_chart.boxplot();
							bpseries = [];
							bpdata = common.normalizeDataframe(data.VISIT_DURATION_BY_TYPE);
							for (i = 0; i < bpdata.CATEGORY.length; i++) {
								bpseries.push({
									Category: bpdata.CATEGORY[i],
									min: bpdata.MIN_VALUE[i],
									max: bpdata.MAX_VALUE[i],
									median: bpdata.MEDIAN_VALUE[i],
									LIF: bpdata.P10_VALUE[i],
									q1: bpdata.P25_VALUE[i],
									q3: bpdata.P75_VALUE[i],
									UIF: bpdata.P90_VALUE[i]
								});
							}

							boxplot.render(bpseries, "#reportVisitOccurrences #visitDurationByType", 500, 300, {
								yLabel: 'Duration'
							});

							// prevalence by month
							var byMonthSeries = common.mapMonthYearDataToSeries(data.PREVALENCE_BY_MONTH, {
								dateField: 'X_CALENDAR_MONTH',
								yValue: 'Y_PREVALENCE_1000PP',
								yPercent: 'Y_PREVALENCE_1000PP'
							});

							var prevalenceByMonth = new jnj_chart.line();
							prevalenceByMonth.render(byMonthSeries, "#reportVisitOccurrences #visitPrevalenceByMonth", 1000, 300, {
								xScale: d3.time.scale().domain(d3.extent(byMonthSeries[0].values, function (d) {
									return d.xValue;
								})),
								xFormat: d3.time.format("%m/%Y"),
								tickFormat: d3.time.format("%m/%Y"),
								xLabel: "Date",
								yLabel: "Prevalence per 1000 People"
							});
						}
					});
				}

				visit_occurrence.render = function (datasource) {
					format_pct = d3.format('.2%');
					format_fixed = d3.format('.2f');
					format_comma = d3.format(',');

					$('#reportVisitOccurrences svg').remove();

					width = 1000;
					height = 250;
					minimum_area = 50;
					threshold = minimum_area / (width * height);

					$.ajax({
						type: "GET",
						url: getUrlFromData(datasource, 'visit_treemap'),
						contentType: "application/json; charset=utf-8",
						success: function (data) {
							data = common.normalizeDataframe(data);
							var normalizedData = common.normalizeDataframe(data);
							var table_data = normalizedData.CONCEPT_PATH.map(function (d, i) {
								conceptDetails = this.CONCEPT_PATH[i].split('||');
								return {
									concept_id: this.CONCEPT_ID[i],
									visit_type_name: conceptDetails[0],
									num_persons: format_comma(this.NUM_PERSONS[i]),
									percent_persons: format_pct(this.PERCENT_PERSONS[i]),
									records_per_person: format_fixed(this.RECORDS_PER_PERSON[i])
								}
							}, data);

							datatable = $('#visit_table').DataTable({
								order: [2, 'desc'],
								dom: 'Clfrtip',
								data: table_data,
								columns: [
									{
										data: 'concept_id',
										visible: false
									},
									{
										data: 'visit_type_name'
									},
									{
										data: 'num_persons',
										className: 'numeric'
									},
									{
										data: 'percent_persons',
										className: 'numeric'
									},
									{
										data: 'records_per_person',
										className: 'numeric'
									}
								],
								pageLength: 5,
								lengthChange: false,
								deferRender: true,
								destroy: true
							});

							$('#reportVisitOccurrences').show();

							tree = buildHierarchyFromJSON(data, threshold);
							var treemap = new jnj_chart.treemap();
							treemap.render(tree, '#reportVisitOccurrences #treemap_container', width, height, {
								onclick: function (node) {
									visit_occurrence.drilldown(node.id, node.name)
								},
								getsizevalue: function (node) {
									return node.num_persons;
								},
								getcolorvalue: function (node) {
									return node.records_per_person;
								},
								getcontent: function (node) {
									var result = '',
										steps = node.path.split('||'),
										i = steps.length - 1;
									result += '<div class="pathleaf">' + steps[i] + '</div>';
									result += '<div class="pathleafstat">Prevalence: ' + format_pct(node.pct_persons) + '</div>';
									result += '<div class="pathleafstat">Number of People: ' + format_comma(node.num_persons) + '</div>';
									result += '<div class="pathleafstat">Records per Person: ' + format_fixed(node.records_per_person) + '</div>';
									return result;
								},
								gettitle: function (node) {
									var title = '',
										steps = node.path.split('||');
									for (i = 0; i < steps.length - 1; i++) {
										title += ' <div class="pathstep">' + Array(i + 1).join('&nbsp;&nbsp') + steps[i] + ' </div>';
									}
									return title;
								}
							});
							$('[data-toggle="popover"]').popover();
						}

					});
				}

				function buildHierarchyFromJSON(data, threshold) {
					var total = 0;

					var root = {
						"name": "root",
						"children": []
					};

					for (i = 0; i < data.PERCENT_PERSONS.length; i++) {
						total += data.PERCENT_PERSONS[i];
					}

					for (var i = 0; i < data.CONCEPT_PATH.length; i++) {
						var parts = data.CONCEPT_PATH[i].split("||");
						var currentNode = root;
						for (var j = 0; j < parts.length; j++) {
							var children = currentNode["children"];
							var nodeName = parts[j];
							var childNode;
							if (j + 1 < parts.length) {
								// Not yet at the end of the path; move down the tree.
								var foundChild = false;
								for (var k = 0; k < children.length; k++) {
									if (children[k]["name"] == nodeName) {
										childNode = children[k];
										foundChild = true;
										break;
									}
								}
								// If we don't already have a child node for this branch, create it.
								if (!foundChild) {
									childNode = {
										"name": nodeName,
										"children": []
									};
									children.push(childNode);
								}
								currentNode = childNode;
							} else {
								// Reached the end of the path; create a leaf node.
								childNode = {
									"name": nodeName,
									"num_persons": data.NUM_PERSONS[i],
									"id": data.CONCEPT_ID[i],
									"path": data.CONCEPT_PATH[i],
									"pct_persons": data.PERCENT_PERSONS[i],
									"records_per_person": data.RECORDS_PER_PERSON[i]
								};

								// we only include nodes with sufficient size in the treemap display
								// sufficient size is configurable in the calculation of threshold
								// which is a function of the number of pixels in the treemap display
								if ((data.PERCENT_PERSONS[i] / total) > threshold) {
									children.push(childNode);
								}
							}
						}
					}
					return root;
				};
				return visit_occurrence;
			});
		})();
