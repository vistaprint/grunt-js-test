'use strict';

var jscoverage_currentFile = null;
var jscoverage_currentLine = null;
var jscoverage_inLengthyOperation = false;

// http://www.quirksmode.org/js/findpos.html
function jscoverage_findPos(obj) {
	var result = 0;
	do {
		result += obj.offsetTop;
		obj = obj.offsetParent;
	}
	while (obj);
	return result;
}

// Shows a progress bar
function jscoverage_beginLengthyOperation() {
	jscoverage_inLengthyOperation = true;
	ProgressBar.makeVisible().setPercentage(0);
}

// Hides the progress bar
function jscoverage_endLengthyOperation() {
	ProgressBar.setPercentage(100, 'Done');
	// fadeToBackground

	setTimeout(function () {
		jscoverage_inLengthyOperation = false;
		ProgressBar.makeInvisible();
	}, 500);
}

function jscoverage_body_load() {
	function reportError(e) {
		jscoverage_endLengthyOperation();
		$('#summaryErrorDiv').text('Error: ' + e);
	}

	if (!window._$jscoverage) {
		window._$jscoverage = {};

		// jscoverage_beginLengthyOperation();
		$.ajax({
			url: 'jscoverage.json',
			data: {'report': $('#report').val()},
			cache: false,
			dataType: 'json',
			timeout: 10000,
			success: function (data) {
				// jscoverage_endLengthyOperation();
				window._$jscoverage = restoreCoverageData(data);
				jscoverage_recalculateSummaryTab();
			},
			error: function (xhr, status, errorThrown) {
				try {
					var data = JSON.parse(xhr.responseText);
					if (data.message) {
						reportError(data.message);
					} else {
						reportError('Unknown error occurred while trying to get coverage report data.');
					}
				} catch (e) {
					reportError('Unknown error occurred while trying to get coverage report data.');
				}
			}
		});
	}

	jscoverage_initTabControl();
}

// -----------------------------------------------------------------------------
// tab 2

function jscoverage_createLink(file, line) {
	return $('<a>')
		.attr('href', '#' + file)
		.on('click', function (event) {
			event.preventDefault();
			jscoverage_get(file, line);
			return false;
		})
		.text((line || file).toString());
}

var sortOrder = 0;
var sortColumn = 'Coverage';
var sortReOrder = true;
var sortedFiles = null;

function jscoverage_recalculateSummaryTabBy(type) {
	sortReOrder = true;
	if (sortColumn !== type) {
		sortOrder = 1;
	}
	sortColumn = type;
	jscoverage_recalculateSummaryTab(null);
}

function jscoverage_recalculateSummaryTab(cc) {
	var showMissingColumn = $('#showMissing').is(':checked');

	cc = cc || window._$jscoverage;

	if (!cc) {
		throw new Error('No coverage information found.');
	}

	var totals = {
		files: 0,
		statements: 0,
		executed: 0,
		branches: 0,
		branches_covered: 0,
		functions: 0,
		functions_covered: 0
	};

	var file;
	var files = [];
	for (file in cc) {
		if (cc.hasOwnProperty(file)) {
			files.push(file);
		}
	}

	if (files.length === 0) {
		return;
	}

	// if (sortReOrder || files.length !== sortedFiles.length) {
	// 	sortedFiles = getFilesSortedByCoverage(files);
	// 	sortOrder++;
	// 	sortReOrder = false;
	// }
	files = files.sort(function (a, b) {
		if (a.toLowerCase() < b.toLowerCase()) return -1;
		if (a.toLowerCase() > b.toLowerCase()) return 1;
		return 0;
	});

	// empty out the summary tbody as we're about to insert a new table
	var tbody = $('#summaryTbody').empty();

	var rowCounter = 0;
	for (var f = 0; f < files.length; f++) {
		file = files[f];
		var lineNumber;
		var num_statements = 0;
		var num_executed = 0;
		var missing = [];
		var fileCC = cc[file].lineData;
		var length = fileCC.length;
		var currentConditionalEnd = 0;
		var conditionals = null;
		if (fileCC.conditionals) {
			conditionals = fileCC.conditionals;
		}
		for (lineNumber = 0; lineNumber < length; lineNumber++) {
			var n = fileCC[lineNumber];

			if (lineNumber === currentConditionalEnd) {
				currentConditionalEnd = 0;
			}
			else if (currentConditionalEnd === 0 && conditionals && conditionals[lineNumber]) {
				currentConditionalEnd = conditionals[lineNumber];
			}

			if (currentConditionalEnd !== 0) {
				continue;
			}

			if (n === undefined || n === null) {
				continue;
			}

			if (n === 0) {
				missing.push(lineNumber);
			}
			else {
				num_executed++;
			}
			num_statements++;
		}

		var percentage = (num_statements === 0 ? 0 : parseInt(100 * num_executed / num_statements, 10));

		var num_functions = 0;
		var num_executed_functions = 0;
		var fileFunctionCC = cc[file].functionData;
		if (fileFunctionCC) {
			num_functions += fileFunctionCC.length;
			for (var fnNumber = 0; fnNumber < fileFunctionCC.length; fnNumber++) {
				var fnHits = fileFunctionCC[fnNumber];
				if (fnHits !== undefined && fnHits !== null && fnHits > 0) {
					num_executed_functions++;
				}
			}
		}

		var percentageFn = (num_functions === 0 ? 0 : parseInt(100 * num_executed_functions / num_functions, 10));

		var num_branches = 0;
		var num_executed_branches = 0;
		var fileBranchCC = cc[file].branchData;
		if (fileBranchCC) {
			for (lineNumber in fileBranchCC) {
				if (fileBranchCC.hasOwnProperty(lineNumber)) {
					var conditions = fileBranchCC[lineNumber];
					var covered;
					if (conditions !== undefined && conditions !== null && conditions.length) {
						covered = true;
						for (var conditionIndex = 0; conditionIndex < conditions.length; conditionIndex++) {
							var branchData = fileBranchCC[lineNumber][conditionIndex];
							if (branchData === undefined || branchData === null) {
								continue;
							}
							num_branches += 2;
							num_executed_branches += branchData.pathsCovered();
							if (!branchData.covered()) {
								covered = false;
							}
						}
					}
				}
			}
			var percentageBranch = (num_branches === 0 ? 0 : parseInt(100 * num_executed_branches / num_branches, 10));
		}

		var row = $('<tr>');
		// row.addClass(rowCounter++ % 2 == 0 ? "odd" : "even");
		row.attr('id', 'row-' + file);

		var removeMe = $('<span class="right">x</span>').on('click', function () {
			// delete the file from the global object
			delete window._$jscoverage[this];

			// show progress bar
			jscoverage_beginLengthyOperation();

			// recalculate data
			jscoverage_recalculateSummaryTab();
		}.bind(file));

		$('<td>').addClass('leftColumn').append(jscoverage_createLink(file), removeMe).appendTo(row);
		$('<td>').addClass('numeric').text(num_executed + '/' + num_statements).appendTo(row);
		$('<td>').addClass('numeric').text(num_executed_branches + '/' + num_branches).appendTo(row);
		$('<td>').addClass('numeric').text(num_executed_functions + '/' + num_functions).appendTo(row);

		// new coverage td containing a bar graph
		row.append(createProgressBar(percentage, num_statements === 0));

		// new coverage td containing a branch bar graph
		row.append(createProgressBar(percentageBranch, fileBranchCC === undefined || num_branches === 0));

		// new coverage td containing a function bar graph
		row.append(createProgressBar(percentageFn, fileFunctionCC === undefined || num_functions === 0));

		if (showMissingColumn) {
			cell = document.createElement('td');
			for (var i = 0; i < missing.length; i++) {
				if (i !== 0) {
					cell.appendChild(document.createTextNode(', '));
				}
				link = jscoverage_createLink(file, missing[i]);

				// group contiguous missing lines; e.g., 10, 11, 12 -> 10-12
				var j, start = missing[i];
				for (;;) {
					j = 1;
					while (i + j < missing.length && missing[i + j] === missing[i] + j) {
						j++;
					}
					var nextmissing = missing[i + j], cur = missing[i] + j;
					if (isNaN(nextmissing)) {
						break;
					}
					while (cur < nextmissing && ! fileCC[cur]) {
						cur++;
					}
					if (cur < nextmissing || cur >= length) {
						break;
					}
					i += j;
				}
				if (start !== missing[i] || j > 1) {
					i += j - 1;
					link.innerHTML += '-' + missing[i];
				}

				cell.appendChild(link);
			}
			row.append(cell);
		}

		row.appendTo(tbody);

		totals.files++;
		totals.statements += num_statements;
		totals.executed += num_executed;
		totals.branches += num_branches;
		totals.branches_covered += num_executed_branches;
		totals.functions += num_functions;
		totals.functions_covered += num_executed_functions;

		// write totals data into summaryTotals row
		var tr = document.getElementById('summaryTotals');
		if (tr) {
			var tds = $(tr).find('td');
			$(tds[0]).find('span').get(1).firstChild.nodeValue = totals.files;
			$(tds[1]).text(totals.executed + '/' + totals.statements);
			$(tds[2]).text(totals.branches_covered + '/' + totals.branches);
			$(tds[3]).text(totals.functions_covered + '/' + totals.functions);

			var coverage = parseInt(100 * totals.executed / totals.statements, 10);
			if (isNaN(coverage)) {
				coverage = 0;
			}

			$(tds[4]).find('span').text(coverage + '%');
			$(tds[4]).find('.covered').css('width', coverage + 'px');

			coverage = 0;
			if (fileBranchCC !== undefined) {
				coverage = parseInt(100 * totals.branches_covered / totals.branches, 10);
				if (isNaN(coverage)) {
					coverage = 0;
				}
			}

			tds[5].getElementsByTagName('span')[0].firstChild.nodeValue = coverage + '%';
			tds[5].getElementsByTagName('div')[1].style.width = coverage + 'px';

			coverage = 0;
			if (fileFunctionCC !== undefined) {
				coverage = parseInt(100 * totals.functions_covered / totals.functions, 10);
				if (isNaN(coverage)) {
					coverage = 0;
				}
			}

			tds[6].getElementsByTagName('span')[0].firstChild.nodeValue = coverage + '%';
			tds[6].getElementsByTagName('div')[1].style.width = coverage + 'px';
		}

	}
	jscoverage_endLengthyOperation();
}

function getFilesSortedByCoverage(filesIn) {
	var tbody = document.getElementById("summaryTbody");
	if (tbody.children.length < 2) {
		sortOrder=1;
		return filesIn;
	}
	var files = [];
	for (var i=0;i<tbody.children.length;i++) {
		files[i] = {};
		files[i].file = tbody.children[i].children[0].children[0].innerHTML;
		files[i].perc = parseInt(tbody.children[i].children[7].children[1].innerHTML, 10);
		files[i].brPerc = parseInt(tbody.children[i].children[8].children[1].innerHTML, 10);
		files[i].fnPerc = parseInt(tbody.children[i].children[9].children[1].innerHTML, 10);
		if (isNaN(files[i].brPerc))
			files[i].brPerc = -1;
		if (isNaN(files[i].fnPerc))
			files[i].fnPerc = -1;
	}

	if (sortOrder%3===1) {
		if (sortColumn == 'Coverage')
			files.sort(function(file1,file2) {return file1.perc-file2.perc});
		else if (sortColumn == 'Branch')
			files.sort(function(file1,file2) {return file1.brPerc-file2.brPerc});
		else
			files.sort(function(file1,file2) {return file1.fnPerc-file2.fnPerc});
	} else if (sortOrder%3===2) {
		 if (sortColumn == 'Coverage')
			files.sort(function(file1,file2) {return file2.perc-file1.perc});
		 else if (sortColumn == 'Branch')
			 files.sort(function(file1,file2) {return file2.brPerc-file1.brPerc});
		 else
			 files.sort(function(file1,file2) {return file2.fnPerc-file1.fnPerc});
	} else {
			return filesIn.sort();
	}
	var result = [];
	for (var i=0;i<files.length;i++) {
		result[i] = files[i].file;
	}
	return result;
}

function jscoverage_appendMissingColumn() {
	$('#headerRow').append(
		$('<th id="missingHeader" title="List of statements missed during execution">Missing</th>')
	);

	$('#summaryTotals').append(
		$('<td id="missingCell">')
	);
}

function jscoverage_removeMissingColumn() {
	$('#headerRow, #summaryTotals').remove();
}

function jscoverage_checkbox_click(event) {
	if (jscoverage_inLengthyOperation) {
		event.preventDefault();
		return false;
	}

	jscoverage_beginLengthyOperation();

	if ($(this).is(':checked')) {
		jscoverage_appendMissingColumn();
	} else {
		jscoverage_removeMissingColumn();
	}

	jscoverage_recalculateSummaryTab();
}

// -----------------------------------------------------------------------------
// tab 3

function jscoverage_makeTable(lines) {
	var coverage = _$jscoverage[jscoverage_currentFile].lineData;
	var branchData = _$jscoverage[jscoverage_currentFile].branchData;

	// this can happen if there is an error in the original JavaScript file
	if (! lines) {
		lines = [];
	}

	var rows = ['<table id="sourceTable" class="table">'];
	var i = 0;
	var tableHTML;
	var currentConditionalEnd = 0;

	function joinTableRows() {
		tableHTML = rows.join('');
		ProgressBar.setPercentage(60);
		/*
		This may be a long delay, so set a timeout of 100 ms to make sure the
		display is updated.
		*/
		setTimeout(function() {appendTable(jscoverage_currentFile);}, 100);
	}

	function appendTable(jscoverage_currentFile) {
		var sourceDiv = document.getElementById('sourceDiv');
		sourceDiv.innerHTML = tableHTML;
		ProgressBar.setPercentage(80);
		setTimeout(jscoverage_scrollToLine, 0);
	}

	while (i < lines.length) {
		var lineNumber = i + 1;

		if (lineNumber === currentConditionalEnd) {
			currentConditionalEnd = 0;
		}
		else if (currentConditionalEnd === 0 && coverage.conditionals && coverage.conditionals[lineNumber]) {
			currentConditionalEnd = coverage.conditionals[lineNumber];
		}

		var row = '<tr>';
		row += '<td class="numeric">' + lineNumber + '</td>';
		var timesExecuted = coverage[lineNumber];
		if (timesExecuted !== undefined && timesExecuted !== null) {
			if (currentConditionalEnd !== 0) {
				row += '<td class="y numeric">';
			}
			else if (timesExecuted === 0) {
				row += '<td class="r numeric" id="line-' + lineNumber + '">';
			}
			else {
				row += '<td class="g numeric">';
			}
			row += timesExecuted;
			row += '</td>';
		}
		else {
			row += '<td></td>';
		}

		lineNumber = '' + lineNumber;
		if (branchData !== undefined) {
				var branchClass = '';
				var branchText = '&#160;';
				if (branchData[lineNumber] !== undefined && branchData[lineNumber] !== null) {
						branchClass = 'g';
						for (var conditionIndex = 0; conditionIndex < branchData[lineNumber].length; conditionIndex++) {
								if (branchData[lineNumber][conditionIndex] !== undefined && branchData[lineNumber][conditionIndex] !== null && !branchData[lineNumber][conditionIndex].covered()) {
										branchClass = 'r';
										break;
								}
						}

				}
				if (branchClass === 'r') {
						branchText = '<a href="#" onclick="alert(buildBranchMessage(_$jscoverage[\''+jscoverage_currentFile+'\'].branchData[\''+lineNumber+'\']));">info</a>';
				}
				row += '<td class="numeric '+branchClass+'"><pre>' + branchText + '</pre></td>';
		}

		row += '<td><pre>' + lines[i] + '</pre></td>';
		row += '</tr>';
		row += '\n';
		rows[lineNumber] = row;
		i++;
	}
	rows[i + 1] = '</table>';
	ProgressBar.setPercentage(40);
	setTimeout(joinTableRows, 0);
}

function jscoverage_scrollToLine() {
	jscoverage_selectTab('#sourceTab');
	if (! window.jscoverage_currentLine) {
		jscoverage_endLengthyOperation();
		return;
	}
	var div = document.getElementById('sourceDiv');
	if (jscoverage_currentLine === 1) {
		div.scrollTop = 0;
	}
	else {
		var cell = document.getElementById('line-' + jscoverage_currentLine);

		// this might not be there if there is an error in the original JavaScript
		if (cell) {
			var divOffset = jscoverage_findPos(div);
			var cellOffset = jscoverage_findPos(cell);
			div.scrollTop = cellOffset - divOffset;
		}
	}
	jscoverage_currentLine = 0;
	jscoverage_endLengthyOperation();
}

/**
Loads the given file (and optional line) in the source tab.
*/
function jscoverage_get(file, line) {
	if (jscoverage_inLengthyOperation) {
		return;
	}
	jscoverage_beginLengthyOperation();
	setTimeout(function() {
		var sourceDiv = document.getElementById('sourceDiv');
		sourceDiv.innerHTML = '';
		jscoverage_selectTab('#sourceTab');
		if (file === jscoverage_currentFile) {
			jscoverage_currentLine = line;
			jscoverage_recalculateSourceTab();
		}
		else {
			if (jscoverage_currentFile === null) {
				$('#sourceTab').closest('li').removeClass('disabled');
			}
			jscoverage_currentFile = file;
			jscoverage_currentLine = line || 1;  // when changing the source, always scroll to top
			var fileDiv = document.getElementById('fileDiv');
			fileDiv.innerHTML = jscoverage_currentFile;
			jscoverage_recalculateSourceTab();
			return;
		}
	}, 50);
}

/**
Calculates coverage statistics for the current source file.
*/
function jscoverage_recalculateSourceTab() {
	if (! jscoverage_currentFile) {
		jscoverage_endLengthyOperation();
		return;
	}
	ProgressBar.setPercentage(20, 'Calculating coverage ...');
	var request = new XMLHttpRequest();
	var projectBase = document.body.getAttribute('base');
	request.open('GET', projectBase.substr(0, projectBase.length - 1) + jscoverage_currentFile, true);

	request.onload = function() {
		// if (request.status >= 200 && request.status < 400) {
		if (request.status !== 0 && request.status !== 200) {
			return reportError(new Error(request.status));
		}
		// if (this.status >= 200 && this.status < 400)

		var response = request.responseText;
		var displaySource = function() {
				var lines = response.split(/\n/);
				for (var i = 0; i < lines.length; i++)
						lines[i] = $('<div>').text(lines[i]).html();
				jscoverage_makeTable(lines);
		}
		setTimeout(displaySource, 0);
	};

	request.onerror = function(e) {
		reportError(e);
	};

	request.send();
}

// Initializes the tabs to make them actionable
function jscoverage_initTabControl() {
	$('.tabs a').on('click', function (e) {
		e.preventDefault();
		jscoverage_tab_click(e);
		$(this).tab('show');
	});

	// $('.tabs a:not(.disabled):first').trigger('click');
}

// mark a tab and it's related tab page active
function jscoverage_selectTab(tab) {
	$(tab).tab('show');
}

// trigger when a tab is clicked
function jscoverage_tab_click(event) {
	var target = $(event.target);

	if (jscoverage_inLengthyOperation || target.closest('li').hasClass('active')) {
		return;
	}

	jscoverage_beginLengthyOperation();
	setTimeout(function() {
		// on summary tab, we refetch summary data
		if (target.attr('href') === '#summaryPage') {
			var tbody = document.getElementById("summaryTbody");
			while (tbody.hasChildNodes()) {
				tbody.removeChild(tbody.firstChild);
			}
		}
		// on source tab, clear out the file contents
		else if (target.attr('href') === '#sourcePage') {
			var sourceDiv = document.getElementById('sourceDiv');
			sourceDiv.innerHTML = '';
		}

		jscoverage_selectTab(target);

		if (target.attr('href') === '#summaryPage') {
			jscoverage_recalculateSummaryTab();
		} else if (target.attr('href') === '#sourcePage') {
			jscoverage_recalculateSourceTab();
		} else {
			jscoverage_endLengthyOperation();
		}
	}, 50);
}

// -----------------------------------------------------------------------------
// progress bar

var ProgressBar = new (function () {
	this.percentage = 0;
	this.label = 0;

	var update = $.proxy(function () {
		$('#progress .progress-bar').css('width', this.percentage + '%');
		$('#progress span').text(this.label);
		return this;
	}, this);

	this.setPercentage = $.proxy(function (percentage, text) {
		this.percentage = percentage;
		this.label = text || percentage + '%';
		return update();
	}, this);

	this.makeVisible = $.proxy(function () {
		$('#progress').show();
		return this;
	}, this);

	this.makeInvisible = $.proxy(function () {
		$('#progress').hide();
		return this;
	}, this);

	return update();
});

function createProgressBar(percentage, skip) {
	var cell = $('<td>').addClass('coverage');
	var pctGraph = $('<div>').addClass('pctGraph');
	var covered = $('<div>');
	var pct = $('<span>').addClass('pct');
	if (skip) {
		covered.addClass('skipped');
		pct.text('N/A');
	} else {
		covered.addClass('covered');
		covered.css('width', percentage + 'px');
		pct.text(percentage + '%');
	}
	pctGraph.append(covered);
	cell.append(pctGraph);
	cell.append(pct);
	return cell;
}

$(document).ready(function () {
	jscoverage_body_load();

	$('#showMissing').on('click', jscoverage_checkbox_click);

	$('#storeButton').on('click', function () {
		var url = $(this).attr('href');
		jscoverage_beginLengthyOperation();
		$.post(url, { json: saveCoverageData() }, function (data, textStatus, xhr) {
				jscoverage_endLengthyOperation();

				$('#storeDiv').append($('<li>').text(document.createTextNode(new Date() + ': ' + data)));
			}
		);
	});
});