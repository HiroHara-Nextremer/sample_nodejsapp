/*
 * Server-related tasks 
 * 
 */

//==============================================================//
// Dependencies 
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');

// modules imported from the current directory 
const config = require('./config');
const handlers = require('./handlers');
const _data = require('./data');
const helpers = require('./helpers');
const path = require('path');

//==============================================================//

// Test Strar=========================================================== 
// Create a new file
//_data.create('test','newFile',{'foo':'bar'},(err) => {
//	console.log(err);
//});

// Read the file 
//_data.read('test','newFile',(err,data) => {
//	console.log(err);
//	console.log(data);
//});

// Update the file 
//_data.update('test','newFile', {'hiroaki':'Hara'},(err) => {
//	console.log('err: ',err);
//});

// Delete the file 
//_data.delete('test','newFile',(err) => {
//	console.log('Error status: ', err);
//});

// ===========================================================Test End 

// Instantiate the server module object 
const server = {};

// 	Instantiate the HTTP server
server.httpServer = http.createServer((req,res) => {
	server.unifiedServer(req,res);
});

// 	Instantiate the HTTPS server
server.httpsServerOptions = {
	'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
	'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = http.createServer(server.httpsServerOptions,(req,res) => {
	server.unifiedServer(req,res);
});


// All the server logic for both the http and https server
server.unifiedServer = (req,res) => {

	// Get rhe URL and parse it 
	const parsedUrl = url.parse(req.url,true);

	// Get the path
	const path = parsedUrl.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g,'');

	// Get the query string as an object
	const queryStringObject = parsedUrl.query;
	
	// Get the HTTP method 
	const method = req.method.toLowerCase();
	
	// Get the header as an object
	const headers = req.headers;

	// Get the payload, if any
	const decoder = new StringDecoder('utf-8');
	let buffer = '';
	req.on('data',(data) => {

		buffer += decoder.write(data);

	});

	req.on('end',() => {

		buffer += decoder.end();


		// Choose the handler this request should go to. If one is not found, user not found handler
		const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
		// Construct the data object to send to the handler
		const data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer) 
		};

		// Route the request to the handler specified in the router 
		chosenHandler(data,(statusCode,payload) => {
			// Use the statud code called back by the hander, or default to 200
			statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

			// User the payload called by the handler, or default to an emty object
			payload = typeof(payload) === 'object' ? payload : {}; 

			// Convert the payload to a string since every payload received comes with a type of object
			const payloadString = JSON.stringify(payload);

	// Return the response
			res.setHeader('Content-Type','application/json');
			res.writeHead(statusCode);
			res.end(payloadString);

			// ==========================Log out the responses========================= 
			const yellow = '\u001b[33m';
			const magenta = '\u001b[35m';
			const reset = '\u001b[0m';

			console.log(yellow + 'Begin==========================================\n' + reset);
			console.log(yellow + 'headers :' + reset, headers);
			console.log(yellow + 'status code' + reset, statusCode);
			console.log(yellow + 'query string :' + reset, queryStringObject);
			console.log(yellow + 'payload :' + reset, payloadString);
			console.log(yellow + 'data :' + reset,data);
			console.log(yellow + '============================================End\n' + reset);
			// ======================================================================== 
		});
	});
};

// Define a request router 
server.router = {
	'sample' : handlers.sample,
	'users' : handlers.users,
	'tokens' : handlers.tokens,
	'checks' : handlers.checks
};

// Init script 
server.init = () => {
	// Start the HTTP server 
	server.httpServer.listen(config.httpPort,() => {
		console.log('Listening port on No : ', config.httpPort);
	});

	// Start the HTTPS server 
	server.httpsServer.listen(config.httpsPort,() => {
		console.log('Listening port on No: ', config.httpsPort);
	});
};

// Export the module 
module.exports = server;
