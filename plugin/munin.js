var shared = require('./shared');

module.exports = function (service) {
    var Munin = require('munin-client');

    return function (funneler) {
        var from = service.from;
        // cast to array
        if (typeof from == 'string') {
            from = [from];
        }
        from.forEach(function (host) {
            var munin = new Munin(host);
            for (var sName in service.services) {
                (function (serviceName) { // yum! delicious scope!
                munin.fetch(serviceName, function(metrics) {
                    for (var metricName in metrics) {

                        var capture = false;
                        if (shared.ALL == service.services[serviceName]) {
                            capture = true;
                        } else if (service.services[serviceName].indexOf(metricName) !== -1) {
                            capture = true;
                        }
                        if (capture) {
                            funneler({
                                'funnel': 'munin',
                                'nodeName': host,
                                'serviceName': serviceName,
                                'metricName': metricName,
                                'reading': metrics[metricName]
                            });
                        }
                    }
                });
                })(sName);
            }
            munin.quit();
        });
    }
};

