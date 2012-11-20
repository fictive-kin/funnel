var shared = require('./shared');

module.exports = function (service) {
    var pending = 0;

    var DBWrapper = require('node-dbi').DBWrapper;
    var DBExpr = require('node-dbi').DBExpr;

    var dbWrapper = new DBWrapper(service.from.adapter, service.from);

    return function(funneler) {

        dbWrapper.connect();

        for (var serviceName in service.services) {

            (function (serviceName, thisService) {
                pending++;
                dbWrapper.fetchAll(thisService.query, null, function(err, result) {
                    pending--;
                    if (err) {
                        console.log("Error in dbi:", err);
                        if (0 == pending) {
                            dbWrapper.close(shared.nocb);
                        }
                        return;
                    }

                    var reading = thisService.callback(result);

                    if ("object" == typeof reading) {
                        if (serviceName.indexOf('%') === -1) {
                            throw "Can't emit multiple values if metric name does not contain %";
                        }
                        for (var k in reading) {
                            var val = reading[k];
                            var metricName = serviceName.replace('%', k);
                            funneler({
                                'funnel': 'dbi',
                                'nodeName': thisService.name || service.hostalias || service.from.adapter + '-' + service.from.host,
                                'metricName': metricName,
                                'reading': val,
                                'preserveMetricNameDot': true
                            });

                        }

                    } else { // scalar
                        funneler({
                            'funnel': 'dbi',
                            'nodeName': thisService.name || service.hostalias || service.from.adapter + '-' + service.from.host,
                            'metricName': serviceName,
                            'reading': reading,
                        });

                    }

                    if (0 == pending) {
                        dbWrapper.close(shared.nocb);
                    }
                });
            })(serviceName, service.services[serviceName]);

        };

    };
};

