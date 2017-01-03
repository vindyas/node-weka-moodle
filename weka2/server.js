var express = require('express');
var app = express();
var _ = require('underscore');
var weka = require('./lib/weka-lib.js');

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var bodyParser = require('body-parser')
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.post('/predict-all', function(req, res) {
    var options = {
            'classifier': 'weka.classifiers.trees.J48',
            'params': '-v -p 0 -x 6'
        },
        students = req.body.students,
        studentsCount = students.length,
        callPrediction = function(index) {
            var student = students[index],
                params = {
                    PercentageOfOpenedDiscussion: student.PercentageOfOpenedDiscussion,
                    PercentageOfReplies: student.PercentageOfReplies,
                    PercentageOfWikiEntries: student.PercentageOfWikiEntries,
                    PercentageOfAssignCompletion: student.PercentageOfAssignCompletion,
                    PercentageOfVisitOfStudent: student.PercentageOfVisitOfStudent,
                    PercentagOfAccessedResource: student.PercentagOfAccessedResource,
                    cluster: 1
                };
            weka.predict('data/StudentData.arff', params, options, function(err, result) {

                student.predicted = (result.predicted === '1') ? 'Good' : 'Weak';
                index++;
                if (index === studentsCount) {
                    res.json(students);
                } else {
                    callPrediction(index);
                }
            });
        }

    if (studentsCount > 0) {
        callPrediction(0);
    }
});

app.post('/train', function(req, res) {
    var students = _.map(req.body.students, function(student) {
        return {
            PercentageOfOpenedDiscussion: student.PercentageOfOpenedDiscussion,
            PercentageOfReplies: student.PercentageOfReplies,
            PercentageOfWikiEntries: student.PercentageOfWikiEntries,
            PercentageOfAssignCompletion: student.PercentageOfAssignCompletion,
            PercentageOfVisitOfStudent: student.PercentageOfVisitOfStudent,
            PercentagOfAccessedResource: student.PercentagOfAccessedResource,
            cluster: student.Cluster
        };
    })
    weka.createArff({
        name: 'StudentData3',
        path: 'data/',
        attributes: [
            'PercentageOfOpenedDiscussion',
            'PercentageOfReplies',
            'PercentageOfWikiEntries',
            'PercentageOfAssignCompletion',
            'PercentageOfVisitOfStudent',
            'PercentagOfAccessedResource',
            'cluster'
        ],
        types: {
            PercentageOfOpenedDiscussion: {
                type: 'numeric'
            },
            PercentageOfReplies: {
                type: 'numeric'
            },
            PercentageOfWikiEntries: {
                type: 'numeric'
            },
            PercentageOfAssignCompletion: {
                type: 'numeric'
            },
            PercentageOfVisitOfStudent: {
                type: 'numeric'
            },
            PercentagOfAccessedResource: {
                type: 'numeric'
            },
            cluster: {
                type: 'nominal',
                oneof: [0, 1]
            }
        }
    }, students, function() {
        res.json({
            success: true
        });
    });
});

app.get('/predict', function(req, res) {
    var options = {
        'classifier': 'weka.classifiers.trees.J48',
        'params': '-v -p 0 -x 6'
    };

    var params = {
        PercentageOfOpenedDiscussion: req.param('PercentageOfOpenedDiscussion'),
        PercentageOfReplies: req.param('PercentageOfReplies'),
        PercentageOfWikiEntries: req.param('PercentageOfWikiEntries'),
        PercentageOfAssignCompletion: req.param('PercentageOfAssignCompletion'),
        PercentageOfVisitOfStudent: req.param('PercentageOfVisitOfStudent'),
        PercentagOfAccessedResource: req.param('PercentagOfAccessedResource'),
        cluster: 1
    };

    weka.predict('data/StudentData.arff', params, options, function(err, result) {
        res.json(result);
    });

});

app.get('/model-stats', function(req, res) {
    var options = {
        'classifier': 'weka.classifiers.trees.J48',
        'params': '-v -x 6'
    };

    weka.model_stats('data/StudentData2.arff', options, function(err, result) {
        var splitted = result.split('\n');
        var result = splitted.splice(40, 8);
        res.json(err ? ['Error: Cannot calculate statistics'] : result);
    });
});

app.listen(5000, function() {
    console.log('Server is listening on port 5000!');
});
