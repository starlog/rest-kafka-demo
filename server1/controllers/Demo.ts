'use strict';

var utils = require('../utils/writer.js');
var Demo = require('../service/DemoService');

module.exports.demoRequest = function demoRequest (req, res, next) {
  Demo.demoRequest()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};
