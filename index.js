var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var c = gutil.colors;
var path = require('path');
var fs = require('fs');
var async = require('async');
var msTranslator = require('mstranslator');
var pluginName = require('./package.json').name;
var File = require('vinyl');
//var BufferStreams = require("bufferstreams");

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

  function translateFile(file) {
    var translateTasks = [];
    var params = {
      text: '',
      from: configuration.masterLanguage,
      to: configuration.languages[langIndex]
    };

    // var original;
    // var translated;
    //var translated = JSON.parse(JSON.stringify(original));
    var original = JSON.parse(file.contents.toString('utf8'));
    var translated = JSON.parse(file.contents.toString('utf8'));
    // var original = JSON.parse(JSON.stringify(file.contents.toString('utf8')));
    // var translated = JSON.parse(JSON.stringify(file.contents.toString('utf8')));

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
        return translated;
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
        //translateFile(file); //Writes wrong file.
        //file.contents = translateFile(file); //Writes wrong file.
        //file.contents = new Buffer(translateFile(file)); //Writes no file.

        for (var i = 0; i <= configuration.languages.length; i++) {

          //var sourceMapPath = path.join(file.base, destPath, file.relative) + '.map';

          // console.log(file.cwd);
          // console.log(file.base);
          // console.log(file.path);
          // console.log(path.basename(file.path));
          // console.log(file.relative);

          console.log('gets here..............[1]');

          var translatedFile = new File({
            cwd: file.cwd,
            base: file.base,
            path: path.join(file.base, configuration.dest, file.relative) + '.json',
            // contents: new Buffer(JSON.stringify(translateFile(file))),
            contents: new Buffer(translateFile(file))
          });

          console.log('gets here..............[2]');

          console.log(translatedFile);

          console.log('gets here..............[3]');

          this.push(translatedFile);
        }
      } catch (error) {
        this.emit('error', error);
        return callback();
      }
    }

    //this.push(file);
    callback();
  });
};