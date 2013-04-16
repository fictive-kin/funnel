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

                var nodeName = thisService.name || service.from.hostalias || service.from.adapter + '-' + service.from.host;

                if (undefined !== thisService.chance) {
                    var r = Math.random();
                    if (thisService.chance < r) {
                        console.log("Not funneling " + nodeName + "." + serviceName + "; failed chance of " + thisService.chance + " < " + r);
                        return;
                    } else {
                        console.log("Funneling " + nodeName + "." + serviceName + "; passed chance of " + thisService.chance + " >= " + r);
                    }
                }

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

                    var callback = thisService.callback || shared.dbiSolo;
                    var reading = callback(result);

                    if ("object" == typeof reading) {
                        if (serviceName.indexOf('%') === -1) {
                            throw "Can't emit multiple values if metric name does not contain %";
                        }
                        for (var k in reading) {
                            var val = reading[k];
                            var metricName = serviceName.replace('%', k);
                            funneler({
                                'funnel': 'dbi',
                                'nodeName': nodeName,
                                'metricName': metricName,
                                'reading': val,
                                'preserveMetricNameDot': true
                            });

                        }

                    } else { // scalar
                        funneler({
                            'funnel': 'dbi',
                            'nodeName': nodeName,
                            'metricName': serviceName,
                            'reading': reading,
                            'preserveMetricNameDot': thisService.preserveMetricNameDot,
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

