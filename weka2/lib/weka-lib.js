var arffSchema = require('./arff-schema');
(function() {
    var exec = require('child_process').exec;
    var child;
    var async = require('async');
    var _ = require('underscore');

    _.str = require('underscore.string');
    _.mixin(_.str.exports());
    _.str.include('Underscore.string', 'string');

    var fs = require('fs');

    exports.createArff = arffSchema.createArff;

    var invokeWeka = function(fileParams, options, callback) {
        child = exec('java -classpath ./bin/weka.jar ' + options.classifier + ' ' +
            options.params + ' ' +
            fileParams,
            function(error, stdout, stderr) {

                if (error || stderr) {
                    console.log(error || stderr)
                }

                callback(stdout, error || stderr);
            });
    };

    /**
     * CLI Docs http://www.cs.waikato.ac.nz/~remco/weka_bn/node13.html
     */
    exports.predict = function(fileIdTraining, test, options, cb) {

        async.waterfall([
            function(callback) {
                arffSchema.createArff(fileIdTraining, [test], callback);
            },

            function(fileIdTest, callback) {
                invokeWeka(('-t ' + fileIdTraining + ' -T ' + fileIdTest), options, function(stdout, error) {
                    var splitted = _.clean(stdout.split('\n')[5]).split(' ');
                    var result = {
                        predicted: splitted[2].split(':')[1]
                    };
                    fs.unlink(fileIdTest, function() {}); // Delete random created test file
                    callback(error, result);
                });
            }
        ], function(err, result) {
            cb(err, result);
        });

    };

    exports.model_stats = function(fileIdTraining, options, cb) {
        invokeWeka(('-t ' + fileIdTraining), options, function(stdout, error) {
            cb(error, stdout);
        });
    };

}).call(this);
