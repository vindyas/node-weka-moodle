var fs = require('fs'),
    readline = require('readline'),
    async = require('async'),
    _ = require('underscore'),
    EventEmitter = require('events').EventEmitter;

var createArff = function(fileSource, data, cb) {
    /** JS Arff format back to weka arff format */
    var arffObj = {},
        arffFile = '';
    arffFile += '@relation ';
    arffFile += fileSource.name || 'test';
    arffFile += '\n\n';

    async.waterfall([
        function(callback) {
            arffObj.data = data;
            arffObj.attributes = [];
            arffObj.types = {};
            if (fileSource.name) {
                // if fileSource is a object
                arffObj.attributes = fileSource.attributes;
                arffObj.types = fileSource.types;
                callback();
            } else {
                // if fileSource is a file path
                var file = readFile(fileSource);
                file.on('attribute', function(name, type) {
                    arffObj.attributes.push(name);
                    arffObj.types[name] = type;
                });
                file.on('end', function(data) {
                    callback();
                });
            }
        },
        function(callback) {
            var i = 0;
            async.eachSeries(arffObj.data, function(obj, dataCb) {

                console.log(_.keys(obj))
                async.eachSeries(_.keys(obj), function(key, mapCb) {
                    if (arffObj.types[key].type.indexOf('nominal') > -1 && !_.isString(arffObj.data[i][key])) {
                        arffObj.data[i][key] = arffObj.types[key].oneof[arffObj.data[i][key]];
                    }

                    mapCb();

                }, function(err) {
                    i++;
                    dataCb(err);
                });

            }, function(err) {
                callback(err);
            });

        },
        function(callback) {

            async.eachSeries(arffObj.attributes, function(obj, attrCb) {

                arffFile += '@attribute ';
                arffFile += obj;
                arffFile += ' ';

                if (arffObj.types[obj].type.indexOf('nominal') > -1) {
                    arffFile += '{' + arffObj.types[obj].oneof + '}';
                } else {
                    arffFile += arffObj.types[obj].type;
                }

                arffFile += '\n';

                attrCb();

            }, function(err) {
                callback(err);
            });

        },
        function(callback) {

            arffFile += '\n';
            arffFile += '@data';
            arffFile += '\n';

            async.eachSeries(arffObj.data, function(obj, dataCb) {

                arffFile += _.values(obj);
                arffFile += '\n';

                dataCb();

            }, function(err) {
                callback(err);
            });
        }
    ], function(err, result) {

        var fileId = (fileSource.path ? (fileSource.path + fileSource.name) : ('tmp/node-weka-' + _.random(0, 10000000))) + '.arff';

        fs.writeFile(fileId, arffFile, function(err) {
            cb(err, fileId);
        });

    });

};

var readFile = function arff(input) {
    var is;
    var emitter = new EventEmitter();
    var section;

    if (typeof input === 'string') {
        is = fs.createReadStream(input);
    }
    // input is a readable stream
    else if (input.readable) {
        is = input;
    } else {
        process.nextTick(function() {
            emitter.emit('error', new Error('Unknown input:' + input));
        });
    }
    var writeStream = fs.createWriteStream('tmp/log');
    var handlers = {
        line: function(line) {
            if (!section) section = 'header';

            var chunks = line.trim().split(/[\s]+/);

            // skip blank lines and comments
            if (chunks.length === 1 && chunks[0] === '') return;
            else if (/^%/.test(chunks[0])) {
                return;
            }
            // relation name
            else if (/^@RELATION/i.test(chunks[0])) {
                if (section !== 'header') {
                    return emitter.emit('error', new Error('@RELATION found outside of header'));
                }
                emitter.emit('relation', chunks[1])
            }
            // attribute spec
            else if (/^@ATTRIBUTE/i.test(chunks[0])) {
                if (section != 'header') {
                    return emitter.emit('error', new Error('@ATTRIBUTE found outside of header section'));
                }
                var name = chunks[1].replace(/['"]|:$/g, '');
                var type = parseAttributeType(chunks.slice(2).join(' '));
                emitter.emit('attribute', name, type);
            } else if (/^@DATA/i.test(chunks[0])) {
                if (section == 'data') {
                    return emitter.emit('error', new Error('@DATA found after DATA'));
                }
                section = 'data';
            } else {
                if (section == 'data') {
                    emitter.emit('data', chunks.join('').replace(/['"]/g, '').split(','));
                }
            }
        },
        end: function() {
            emitter.emit('end');
            writeStream.end();
        },
        error: function(err) {
            emitter.emit('error', err);
        }
    }

    lines = readline.createInterface({
        input: is,
        output: writeStream
    });
    lines.on('line', handlers.line);
    lines.on('error', handlers.error);
    lines.on('close', handlers.end);

    return emitter;
}

/*
 * Types can be any of:
 *  - numeric | integer | real | continuous
 *  - string
 *  - date [format]
 *  - nominal
 */
function parseAttributeType(type) {
    var finaltype = {
        type: type
    };
    var parts;

    if (/^date/i.test(type)) {
        parts = type.split(/[\s]+/);
        var format = "yyyy-MM-dd'T'HH:mm:ss";
        if (parts.length > 1) {
            format = parts[1];
        }
        finaltype = {
            type: 'date',
            format: format
        }
    } else if (parts = type.match(/^{([^}]*)}$/)) {
        finaltype.type = 'nominal';
        finaltype.oneof = parts[1].replace(/[\s'"]/g, '').split(/,/);
    } else if (/^numeric|^integer|^real|^continuous/i.test(type)) {
        finaltype.type = 'numeric';
    } else if (/string/i.test(type)) {
        finaltype.type = 'string';
    }

    return finaltype;
}

module.exports = {
    createArff: createArff,
    readFile: readFile
}
