/*
 * Primary file for API
 *
 */

// Dependencies 
const server = require('./lib/server_cp');
const helpers = require('./lib/helpers');
//const workers = require('./lib/workers');

// @TODO delete this later
helpers.sendTwilioSms('09042754377','hello',(err) => {
	console.log('this was the error',err);
});
// Declare the app 
const app = {};

// Init function 
app.init = () => {

	// Start the server 
	server.init();
	
	// Start the workers
//	workers.init(); 
};

// Self executing 
app.init();

// Export the app
module.exports = app;
