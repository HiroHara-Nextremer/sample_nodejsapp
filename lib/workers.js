/* 
 * Worker-related tasks
 *
 */

// Dependencies=========================
// Node built-in module
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = requre('http');
const url = require('url');

// The other direcotires from the project
const _data = require('./data');
const helpers = require('./helpers');
//======================================

// Instantiate the worder object 
const workers = {};

// Lookup all checks, get their data, send to validator 
workers.gatherAllChecks = () => {
	// Get all the checks
	_data.list('checks',(err,checks) => {
		if(!err && checks && checks.length > 0) {
			checks.forEach(check => {
				// Readin the check data
				_data.read('checks',check,(err,originalCheckData) => {
					if(!err && originalCheckData) {
						// Pass it to the check validator, and let that function continue the function or log the err(s) as needed
						workers.validateCheckData(originalCheckData);
					} else {
						console.log('Error : Reading one of the check\'s data:',err)
					}
				});
			});
		} else {
			console.log('Error : Could not find any checks to process');
		}
	});
};

// sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {

}

// Timer to execute the worker-process once per min
workers.loop = () => {
	setInterval(() => {
		workers.gatherAllChecks();
	}, 1000 * 60);
}; 

// Initiate sript 
workers.init = () => {
	// Execute all the checks immediately
	workers.gatherAllChecks();	
	// Call the loop so the checks will execute later on 
	workers.loop();
};

// Export the module 
module.exports = workers;
