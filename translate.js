var gutil = require('gulp-util');
var c = gutil.colors;
var es = require('event-stream');
//var extend = require('xtend');
var path = require('path');
//var spawn = require('child_process').spawn;
//var fork = require('child_process').fork;
var fs = require('fs');
var async = require('async');
var msTranslator = require('mstranslator');

//Example of options:
// var options = {
//   client: {
//     clientId: 'example',
//     clientSecret: 'example'
//   },
//   files: [
//     {langFrom: 'en', langTo: 'de', fileInputPath: 'path/to/file.json'},
//     {langFrom: 'en', langTo: 'fr', fileInputPath: 'path/to/file.json'}
//   ],
//   fileOutputPath: 'path/to/output/directory' //Will always be json file(s)
// };

var jsonTranslate = function(options) {
  //var child;
  var files = options.files || [];
  var getClass = {}.toString;
  var stream;

  var client = new msTranslator({
    client_id: options.client.clientId,
    client_secret: options.client.clientSecret
  }, true);

  function makeTranslationCalls() {
    gutil.log(c.yellow('Calling the ms-translate api...'));

    var translateFiles = [];

    // child = fork(translateFile(files[i]));
    // child.on('exit', function(stuff) {
    //   console.log('Child exist fork process number ' + i);
    //   console.log(stuff);
    //   //done(code);
    // });

    for (var i = 0; i <= files.length; i++) {
      gutil.log('On the file number ' + i);
      translateFiles.push(translateFile(files[i]));
    }


    async.series(translateFiles, function(error, res) {
      if (error) {
        gutil.log(c.red(error));
        return;
      } else {

      }
    });

    // End the stream if it exists
    if (stream) {
      if (code) {
        stream.emit('error', new gutil.PluginError('gulp-karma', 'karma exited with code ' + code));
      }
      else {
        stream.emit('end');
      }
    }
  }

  function translateFile(file) {
    var translateTasks = [];
    var params = {
      text: '',
      from: file.langFrom,
      to: file.langTo
    };

    var original = undefined;
    var translated = undefined;
    original = require(file.fileInputPath);
    translated = JSON.parse(JSON.stringify(original));

    gutil.log(c.yellow('Starting translation of: ', file.fileInputPath));
    gutil.log(c.yellow('From ' + file.langFrom + ' to ' + file.langTo));

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

    //Execute the translation tasks and save the resulting object to a JSON file
    async.series(translateTasks, function(error, res) {
      if (error) {
        gutil.log(c.red(error));
        return;
      } else {
       // fs.writeFile(translated_file_path, JSON.stringify(translated, null, 4), function(error) {
        fs.writeFile(options.fileOutputPath + 'language-' + file.langTo + '_' + file.langTo.toUpperCase() + '.json', JSON.stringify(translated, null, 2), function(error) {
          if (error) {
            gutil.log(c.red("Error: ", error));
          } else {
            gutil.log(c.green("Translated file saved to: ", options.fileOutputPath));
          }
        });
      }
    });
  }

  function queueFile(file) {
    if (file) {
      gutil.log(c.yellow('Queueing file for translation: ', file.path));
      files.push(file.path);
    }
    else {
      gutil.log(c.red('Got undefined file at: ', file.path));
      stream.emit('error');
      //stream.emit('error', new Error('Got undefined file'));
    }
  }

  stream = es.through(queueFile, makeTranslationCalls);
  return stream;
};

module.exports = jsonTranslate;
