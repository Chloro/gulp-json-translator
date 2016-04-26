var async = require('async');
var fs = require('fs');
var gutil = require('gulp-util');
var c = gutil.colors;
var pluginName = require('./package.json').name;
var msTranslator = require('mstranslator');

// Example of configuration:
// var configuration = {
//   clientId: 'example',
//   clientSecret: 'example',
//   locales: [
//       {
//         name: 'Egyptian Arabic',
//         localeCode: 'ar-eg',
//         langCode: 'ar_EG',
//         lang: 'ar'
//       },
//       {
//         name: 'German',
//         localeCode: 'de-de',
//         langCode: 'de_DE',
//         lang: 'de'
//       }
//   ],
//   masterLanguage: 'en',
//   src: '/assets/languages/strings.json',
//   dest: '/assets/languages/'
// };

module.exports = function(configuration) {
  if (!configuration.clientId || !configuration.clientSecret) {
    throw new gutil.PluginError(pluginName, "Invalid configuration supplied");
  }

  var getClass = {}.toString;
  var client = new msTranslator({
    client_id: configuration.clientId,
    client_secret: configuration.clientSecret
  }, true);

  function translateFile(fileContents, locale) {
    var translateTasks = [];
    var params = {
      text: '',
      from: configuration.masterLanguage,
      to: locale.lang
    };

    var original = JSON.parse(fileContents.toString('utf8'));
    var translated = JSON.parse(fileContents.toString('utf8'));
    gutil.log(c.yellow('Starting translation of: ', configuration.src));
    gutil.log(c.yellow('From ' + configuration.masterLanguage + ' to ' + locale.lang));

    // For each key in the original file add a translation task
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
              gutil.log(c.blue("[orignal string]:", original[key][nested]));
              gutil.log(c.yellow("[translated string]:", translated[key][nested]));
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
            gutil.log(c.blue('[orignal string]:', original[key]));
            gutil.log(c.yellow('[translated string]:', translated[key]));
            next();
          });
        });
      }
    });

    async.series(translateTasks, function(error, res) {
      if (error) {
        gutil.log(c.red(error));
        return;
      } else {
        var filesource = configuration.dest + '/language-' + locale.langCode + '.json';
        fs.writeFile(filesource, JSON.stringify(translated, null, 2), function(error) {
          if (error) {
            gutil.log(c.red('Error: ', error));
          } else {
            gutil.log(c.green('Translated file saved to: ', filesource));
            return;
          }
        });
      }
    });
  }

  function translateFiles(){
    if (!configuration) {
      throw new gutil.PluginError(pluginName, "No configuration supplied");
    }
    try {
      fs.readFile(configuration.src, 'utf8', function(error, fileContents){
        async.eachSeries(configuration.locales, function(locale, callback) {
          translateFile(fileContents, locale);
          callback();
        });
      });
    } catch (error) {
      gutil.log(c.red('Error: ', error));
    }
  }

  translateFiles();
};
