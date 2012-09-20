var shared = require('./shared');

module.exports = function (service) {
    var vm = require('vm');
    return function(funneler) {
        shared.fromJsonUrl(service.from, function (body, urlParts) {
            for (var serviceName in service.services) {
                var thisService = service.services[serviceName];
                var reading = vm.runInNewContext(thisService, body);
                funneler({
                    'funnel': 'json',
                    'nodeName': service.name || urlParts.host,
                    'metricName': serviceName,
                    'reading': reading
                });
            }
        });
    }

};

