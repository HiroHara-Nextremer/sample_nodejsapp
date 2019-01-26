/* 
 * Request handlers 
 *
 */
// =====Dependencies=====================
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
// ======================================

// Define the handlers 
const handlers = {};

// Users 
handlers.users = (data,callback) => {
	const acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1) {
		handlers._users[data.method](data,callback);	
	} else {
		callback(405);
	}
};

// Container for the users submethods
handlers._users = {};

// Users - post
// required data: first name, last name, phone number, password, tosAgreement
// Optional data: none
handlers._users.post = (data,callback) => {
	// Check that all required fields are filled out 
	const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;	
	const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;	
	const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 11 ? data.payload.phone.trim() : false;	
	const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;	
	const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false;	

	if(firstName && lastName && phone && password && tosAgreement) {

		// Make sure the user does not already exist
	    _data.read('users',phone,(err,data) => {
			if(err) {

				// Hash the user password
				const hashedPassword = helpers.hash(password);

				// Create the user password
				if(hashedPassword) {
					const userObject = {
						'firstName' : firstName,
						'lastName' : lastName,
						'phone' : phone,
						'hashedPassword' : hashedPassword,
						'tosAgreement' : tosAgreement 
					};
					
					// Store the user 
					_data.create('users',phone,userObject,(err) => {
						if(!err) {
							callback(200);
						} else {
							callback(500,{'Error' : 'Could not hash the user\'s password.\n'});
						}
					});
				} else {
					callback(500,{'Error' : 'Could not hash the user\'s password.\n'});
				}
			 } else {
				callback(400,{'Error':'A user with the given phone number already exists.\n'});
			}
		});
	} else {
		callback(400,{'Error': 'Missing reuired fields.\n'});
	}
};
 
// Users - get 
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their object. Do not let access anyone else's
handlers._users.get = (data,callback) => {
	// Check the phone number provided is valid
	// get request does not involve any payloads
	const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 11 ? data.queryStringObject.phone.trim() : false;
	if(phone) {

		// Get the token from the headers 
		const token = typeof(data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token : false; 
		
		// Verify that the given token is valid for the phone number 
		handlers._tokens.verifyToken(token,phone,(tokenIsValid) => {
			if(tokenIsValid) {
				_data.read('users',phone,(err,data) => {
					if(!err && data) {
						// Remove the hashed password from the user object before returning it to the request
						delete data.hashedPassword;
						console.log(tokenIsValid);
						callback(200,data);
					} else {
						callback(404);
					}
				});
			} else {
				callback(403,{'Error':'The token requested is not valid. Could not retired the user date requested.'});
			}
		});
	} else {
		callback(400,{'Error':'Request phone number does not seem to be in the list.'});
	}
};

// Users - put
// Required data : phone 
// Optional data: first name, last name, password (at least one must be specifed)
// @TODO only let an authenticated user update their own own object. Do not let them update anyone else's.
handlers._users.put = (data,callback) => {

	// Check for required field
	const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 11 ? data.payload.phone.trim() : false;

	// Check for optional fields
	const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

	// Return error if phone provided by the user is invalid
	if(phone){
		// Return error unless optional data are provided along with phone
		if(firstName || lastName || password) {
			
			// Get the token from the headers
			const token = typeof(data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token : false;

			// Verify that the given token is valid for the phone number
			handlers._tokens.verifyToken(token,phone,(tokenIsValid) => {
				if(tokenIsValid) {
					_data.read('users',phone,(err,userData) => {
						if(!err && userData) {
							// Update the fields if necessary 
							if(firstName) {
								userData.firstName = firstName;
							}
							if(lastName) {
								userData.lastName = lastName;
							} 
							if(password) {
								userData.hashedPwd = helpers.hash(password);
							}
							// Store the updates 
							_data.update('users',phone,userData,(err) => {
								if(!err) {
									callback(200);
								} else {
									callback(500,{'Error':'Could not update the user.'});
								}					
							});	
						} else {
							callback(400,{'Error':'No such user exists.'});
						}
					});
				} else {
					callbadk(403,{'Error':'Missing required token in the header, or token is not vaid.'});
				}
			});
		} else {
			callback(400,{'Error':'your first name, last name, or password is required.'});
		}
	} else {
		callback(400,{'Eror':'Entered phone number can not be confirmed.'});
	}

};

// Users - delete
// Required data: phone
// @TODO Only let an authenticated user is able to user delete their object. 
// @TODO Clean up(delete) any other data files associated with the user
handlers._users.delete = (data,callback) => {

	// Check the phone number provided in a query string is valid
	const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 11 ? data.queryStringObject.phone.trim() : false;

	if(phone) {
		// Looup the user
		_data.read('users',phone,(err,data) => {
			if(!err && data) {
				_data.delete('users',phone,(err) => {
					if(!err) {
						callback(200);
					} else {
						callback(500,{'Error':'Could not delete the specified user.'});
					}
				});
			} else {
				callback(400,{'Error':'Could not find the user.'});
			}
		});
	} else {
		callback(400,{'Error':'Missing the requied fields'});
	}

};

// Tokens 
handlers.tokens = (data,callback) => {
	const acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1) {
		handlers._tokens[data.method](data,callback);
	} else {
		callback(405);
	}
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - POST
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data,callback) => {

	const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 11 ? data.payload.phone.trim() : false;	
	const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;	

	if(phone && password) {
		// Look up the user who matches the phone number entered
		_data.read('users',phone,(err,userData) => {
			if(!err && userData) {
				// Hash the sent password, comparig it with the one stored in the user object 
				const hashedPassword = helpers.hash(password);

				if(hashedPassword === userData.hashedPassword) {
					// If valid, create a new token with a random name. Set expiration data 1 hour in the future
					const tokenId = helpers.createRandomString(20);
					let expires = Date.now() + 1000 * 60 * 60;
					const tokenObject = {
						'phone' : phone,
						'id' : tokenId,
						'expires' : expires
					};

					// Store the token
					_data.create('tokens',tokenId,tokenObject,(err) => {
						if(!err) {
							callback(200,tokenObject);
						} else {
							callback(500,{'Error':'Could not create the new token.'});
						}
					});
				} else {
					callback(400,{'Error':'Password did not match the specified user\'s stored password.'});
				}				
			} else {
				callback(400,{'Error':'Could not find the specified user.'});
			}
		});
	} else {
		callback(400,{'Error':'Missing required fields'});
	}

};

// Tokens - GET 
// Required data: id(tokenId)
// Optional data: none
handlers._tokens.get = (data,callback) => {
	// Check the entered id is valid
	const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
	if(id) {
		// Loook up the provided token in TOKEN directory 
		_data.read('tokens',id,(err,tokenData) => {
			if(!err && tokenData) {
				callback(200,tokenData);
			} else {
				callback(404,{'Error':'Could not retrieve the token from the ID provided.'});
			}
		});
	} else {
		callback(400,{'Error':'Missing required field, or field invalid.'});
	}
};

// Tokens - PUT	 
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data,callback) => {
	const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
	const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;

	if(id && extend) {
		// Lookup the existing token 
		_data.read('tokens',id,(err,tokenData) => {
			if(!err && tokenData) {
				// Check to make sure the token isn't already expired
				if(tokenData.expires > Date.now()) {
					// Re-set the expiration another one hour from now
					tokenData.expires = Date.now() + 1000 * 60 * 60;
			
					// Store the updates
					_data.update('tokens',id,tokenData,(err) => {
						if(!err) {
							callback(200,tokenData);
						} else {
							callback(500,{'Error':'Could not update the token\'s expiration.'});
						}
					});
				} else {
					callback(400,{'Error':'The token already expired, and no longer extended.'});
				}	
			} else {
				callback(400,{'Error':'The user data requested can not be retrieved.'});
			}
		});
	} else {
		callback(400, {'Error':'Missing required field(s) or field(s) are invalid.'});
	}

};

// Tokens - DELETE 
// Required data: id 
// Optional data: none
handlers._tokens.delete = (data,callback) => {
	// Check that the id entered is valid
	const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;

	if(id) {
		// Look up the token
		_data.read('tokens',id,(err,tokenData) => {
			if(!err && tokenData) {
				// Delete the token 
				_data.delete('tokens',id,(err) => {
					if(!err) {
						callback(200,{'Success':'the token data requested has been deleted.'});
					} else {
						callback(500,{'Error':'Could not delete the data requested.'});
					}
				});
			} else {
				callback(400,{'Error':'Could not find the token requested.'});
			}
		});
	} else {
		callback(400,{'Error':'Missing required field.'});
	}
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id,phone,callback) => {
	// Look up the token 
	_data.read('tokens',id,(err,tokenData) => {
		if(!err && tokenData) {
			// Check that the token is for the given user and has not expired
			if(tokenData.phone === phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};

// Checks
// Requir3e data: protocol, url, method,sucess codes, timeout seconds 
// Optional; none
handlers.checks = (data,callback) => {
	const acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1) {
		handlers._checks[data.method](data,callback);
	} else {
		callback(405);
	}
};

// Contaier for all the checks methods
handlers._checks = {};

// Checks - POST
// Required data: protocol, url, method, success codes, timeout seconds 
// Opetional data: none 
handlers._checks.post = (data,callback) => {
	// Validate inputs 
	const protocol = typeof(data.payload.protocol) === 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false; 
	const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url: false; 
	const method = typeof(data.payload.method) === 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method: false;
	const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false; 

	if(protocol && url && method && successCodes && timeoutSeconds) {
		// get the token from the request header 
		const token = typeof(data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token : false;

		// Lookup the user phone by reading the token taken from the headerse 
		_data.read('tokens',token,(err,tokenData) => {
			if(!err && tokenData) {
				const userPhone = tokenData.phone;

				// Lookup the user data 
				_data.read('users',userPhone,(err,userData) => {
					if(!err && userData){
						const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
						//Verify that user has less than the number of max-checks per user
						if(userChecks.length < config.maxChecks) {
							// Create ramdom id for check 
							const checkId = helpers.createRandomString(20);

							// Create check object including userPhone
							const checkObject = {
								'id' : checkId,
								'userPhone' : userPhone,
								'protocol' : protocol,
								'url' : url,
								'method' : method,
								'successCodes' : successCodes,
								'timeoutSeconds' : timeoutSeconds
							};

							// Ssave the object 
							_data.create('checks',checkId,checkObject,(err) => {
								if(!err) {
									// Add check id to the user's object
									userData.checks = userChecks;
									userData.checks.push(checkId);

								// Save the new user data
								_data.update('users',userPhone,userData,(err) => {
									if(!err) {
										// Return the data about the new check 
										callback(200,checkObject);
									} else {
										callback(500,{'Error':'Could not update the user with the new check.'});
									}
								});
								} else {
									callback(500,{'Error':'Could not create the new check.'});
								}
							});
						} else {
							callback(400,{'Error':'The user alrady has the maximum number of checks.'});
						}	
					} else {
						callbadk(403,{'Error':'no such user exists.'});
					}
				});

			} else {
				console.log(tokenData);
				callback(403,{'Error':'invalid tokens.'});
			}
		});
	}	else {
		callback(400,{'Error':'Missing the requred fields.'});
	}
};

// Checks - Get 
// Required data : id 
// Optional data: none 
handlers._checks.get = (data,callback) => {
	// Check the phone number provided is valid
	// get request does not involve any payloads
	const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
	if(id) {
		// Lookup the check 	
		_data.read('checks',id,(err,checkData) => {
			if(!err && checkData) {
				// Get the token from the headers 
				const token = typeof(data.headers.token) === 'string' && data.headers.token.trim().length === 20 ? data.headers.token : false; 
				// Verify that the given token is valid and belongs to the user who craeted the check  
				handlers._tokens.verifyToken(token,checkData.userPhone,(tokenIsValid) => {
					if(tokenIsValid) {
						callback(200,checkData);
					} else {
						callback(403);
					}
				});
			} else {
				callback(400);
			}
		});
	} else {
		callback(400,{'Error':'Missing required field, or field invalid.'});
	}
};

// Checks -Put 
// Required data: id
// Optional: protocol, url, method, success codes timeout seconds(one of them must be sent)

handlers._checks.put = (data,callback) => {
	// Check for the required field
	const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id : false;
	
	// Check for the optional fields
	const protocol = typeof(data.payload.protocol) === 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false; 
	const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url: false; 
	const method = typeof(data.payload.method) === 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method: false;
	const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false; 

	if(id) {
		// Throw an error if nothing is sent to update
		if(protocol || url || method || successCodes || timeoutSeconds) {
			// Lookup the check 
			_data.read('checks',id,(err,checkData) => {
				if(!err && checkData) {
					// Get the token that sent the request 
					const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
					// Verify that the given token is valid and belongs to the user who created the check
					handlers._tokens.verifyToken(token,checkData.userPhone,(tokenIsValid) => {
						if(tokenIsValid) {
							// Update check data where necessary 
							if(protocol) {
								checkData.protocol = protocol;
							}
							if(url) {
								checkData.url = url;
							}
							if(method) {
								checkData.method = method;
							}
							if(successCodes) {
								checkData.successCodes = successCodes;
							}
							if(timeoutSeconds) {
								checkData.timeoutSeconds = timeoutSeconds;
							}

							// Store the new updates
							_data.update('checks',id,checkData,(err) => {
								if(!err) {
									callback(200);
								} else {
									callback(500,{'Error':'Could not update the check.'});
								}
							});
						} else {
							callback(403);
						}
					});		
				} else {
					callback(400,{'Error':'Check ID did not exist.'});
				}
			});
		} else {
			callback(400,{'Error':'Missing fields to update.'});	
		} 
	} else {
		callback(400,{'Error':'Missing required fields.'});
	}
};

// Checks - Delete 
// Required data: id 
// Optional: none 
handlers._checks.delete = function(data,callback){
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){

            // Delete the check data
            _data.delete('checks',id,function(err){
              if(!err){
                // Lookup the user's object to get all their checks
                _data.read('users',checkData.userPhone,function(err,userData){
                  if(!err){
                    var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from their list of checks
                    var checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1){
                      userChecks.splice(checkPosition,1);
                      // Re-save the user's data
                      userData.checks = userChecks;
                      _data.update('users',checkData.userPhone,userData,function(err){
                        if(!err){
                          callback(200);
                        } else {
                          callback(500,{'Error' : 'Could not update the user.'});
                        }
                      });
                    } else {
                      callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                    }
                  } else {
                    callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                  }
                });
              } else {
                callback(500,{"Error" : "Could not delete the check data."})
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400,{"Error" : "The check ID specified could not be found"});
      }
    });
  } else {
    callback(400,{"Error" : "Missing valid id"});
  }
};

// Sample handler
handlers.sample = (data,callback) => {
	console.log(data);
	callback(200,{"fizz":"buzz"});
};

// Not found handlers 
handlers.notFound = (data,callback) => {
	callback(404);
};

// Export the module 
module.exports = handlers;
