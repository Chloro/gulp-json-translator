var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var c = gutil.colors;
var path = require('path');
var fs = require('fs');
var async = require('async');
var msTranslator = require('mstranslator');
var pluginName = require('./package.json').name;
var BufferStreams = require("bufferstreams");

// Example of configuration:
// var configuration = {
//   clientId: 'example',
//   clientSecret: 'example',
//   languages: ['fr', 'en', 'de', 'zh', 'ar',],
//   masterLanguage: 'en'
// };

module.exports = function(configuration) {
  if (!configuration) {
    throw new gutil.PluginError(pluginName, "No configuration supplied");
  }
  var langIndex = 0;
  var getClass = {}.toString;
  var client = new msTranslator({
    client_id: configuration.clientId,
    client_secret: configuration.clientSecret
  }, true);

  function translateFile(file, buffer, opts) {
    var translateTasks = [];
    var params = {
      text: '',
      from: configuration.masterLanguage,
      to: configuration.languages[langIndex]
    };

    // original = file.contents.toString('utf8');
    // var original = file.contents; // might need ^ instead.
    var original = buffer;
    var translated = JSON.parse(JSON.stringify(original));

    gutil.log(c.yellow('Starting translation of: ', file.path));
    gutil.log(c.yellow('From ' + configuration.masterLanguage + ' to ' + configuration.languages[langIndex]));

    langIndex ++;

    // For each key in the original file add a translation async task
    Object.keys(original).forEach(function(key) {
      if (getClass.call(original[key]) === '[object Object]') {
        // If namespaced key translate the nested keys
        Object.keys(original[key]).forEach(function(nested) {
          translateTasks.push(function(callback) {
            params.text = original[key][nested];
            client.translate(params, function(error, data) {
              if (error) {
                gutil.log(c.red(error));
                callback(error);
              }
              translated[key][nested] = data;
              gutil.log(c.green("ORIGINAL", original[key][nested]));
              gutil.log(c.green("TRANSLATED", translated[key][nested]));
              callback();
            });
          });
        });
      } else {
        translateTasks.push(function(next) {
          params.text = original[key];
          client.translate(params, function(error, data) {
            if (error) {
              gutil.log(c.red(error));
              next(error);
            }
            translated[key] = data;
            gutil.log(c.green("ORIGINAL", original[key]));
            gutil.log(c.green("TRANSLATED", translated[key]));
            next();
          });
        });
      }
    });

    //Execute the translation tasks and send the buffered file downstream
    async.series(translateTasks, function(error, res) {
      if (error) {
        gutil.log(c.red(error));
        return;
      } else {
        return new Buffer(translated);
        //return translated;
      }
    });
  }

  return through.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      this.push(file);
      callback(null, file);
      return;
    }
    if (file.isStream()) {
      this.emit('error', new PluginError(pluginName, 'Streams not supported!'));
    } else if (file.isBuffer()) {
      try {
        file.contents = translateFile(file);
      } catch (error) {
        this.emit('error', new PluginError(pluginName, 'Buffer Error: ', error));
        return callback();
      }
      // Dealing with stream input.
    } else {
      file.contents = file.contents.pipe(new BufferStreams(function(error, buffer, callback) {
        if (error) return callback(new gutil.PluginError(pluginName, error));
        try {
          var transformed = translateFile(file, buffer, opts)
        } catch (error) {
          return callback(error);
        }
        callback(null, transformed);
      }));
    }

    this.push(file);
    callback();
  });
};