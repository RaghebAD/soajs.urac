'use strict';
var fs = require("fs");
var uuid = require('uuid');
var userCollectionName = "users";
var groupsCollectionName = "groups";

var guest = require("./guest.js");
var account = require("./account.js");
var user = require("./user.js");
var group = require("./group.js");
var token = require("./token.js");

var utils = require("./utils.js");

var Mongo = require("soajs").mongo;
var mongoCore = null;

var libProduct = {
	"model": null,
	
	"guest": guest,
	
	"account": account,
	
	"admin": {
		/**
		 * List all the users and groups
		 * @param {Request Object} req
		 * @param {Callback Function} cb
		 */
		"listAll": function (req, cb) {
			if (!mongoCore) {
				mongoCore = new Mongo(req.soajs.registry.coreDB.provision);
			}
			var condition = {
				'locked': true
			};
			var fields = { applications: 0 };
			req.soajs.inputmaskData.tCode = 'DBTN';
			mongoCore.findOne('tenants', condition, fields, function (error, tenant) {
				var data = {
					config: req.soajs.config,
					error: error,
					code: 405
				};
				utils.checkIfError(req, cb, data, false, function () {
					var combo = {
						collection: userCollectionName,
						condition: {},
						fields: {
							'password': 0, 'socialId': 0
						}
					};
					req.soajs.inputmaskData.tCode = tenant.code;
					libProduct.model.initConnection(req.soajs);
					libProduct.model.findEntries(req.soajs, combo, function (err, userRecords) {
						data = {
							config: req.soajs.config,
							error: err,
							code: 405
						};
						utils.checkIfError(req, cb, data, false, function () {
							var combo = {
								collection: groupsCollectionName,
								condition: {}
							};
							libProduct.model.findEntries(req.soajs, combo, function (err, grpRecords) {
								libProduct.model.closeConnection(req.soajs);
								data.code = 415;
								data.error = err;
								utils.checkIfError(req, cb, data, false, function () {
									return cb(null, {
										'users': userRecords,
										'groups': grpRecords
									});
								});
							});
						});
					});
				});
			});
		},
		
		"user": user,
		
		"group": group,
		
		"tokens": token
	}
};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath = __dirname + "/../model/" + modelName + ".js";
		return requireModel(modelPath, cb);
		
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}
				
				account.model = require(filePath);
				guest.model = require(filePath);
				user.model = require(filePath);
				group.model = require(filePath);
				token.model = require(filePath);
				
				libProduct.model = require(filePath);
				return cb(null, libProduct);
			});
		}
	}
};