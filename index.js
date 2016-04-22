var jsonTranslate = require('./translate');

module.exports = function (file, options) {

  // if (arguments.length === 1) {
  //   if (Object.prototype.toString.call(arguments[0]) == '[object Function]') {
  //     callback = arguments[0];
  //   } else {
  //     options = options || {};
  //   }
  // } else {
  //   options = options || {};
  // }
  
  return jsonTranslate(options);
};