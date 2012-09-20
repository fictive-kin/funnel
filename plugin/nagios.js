var shared = require('./shared');

module.exports = function (service) {
    // TODO: validation
    return function(funneler) {
        shared.fromJsonUrl(service.source, function (body) {
            service.from.forEach(function (from) {
                var node;
                if (body.content[from]) {
                    // long name
                    node = body.content[from];
                } else if (body.content[from.split('.')[0]]) {
                    // short name
                    node = body.content[from.split('.')[0]];
                } else {
                    console.log("Could not find server", from);
                    return;
                }

                for (var serviceName in service.services) {
                    if (serviceName in node.services) {
                        var perfDataNames;
                        if (shared.ALL == service.services[serviceName]) {
                            perfDataNames = Object.keys(node.services[serviceName].performance_data);
                        } else {
                            perfDataNames = service.services[serviceName];
                            if (typeof perfDataNames == 'string') {
                                perfDataNames = [perfDataNames];
                            }
                        }

                        perfDataNames.forEach(function (perfName) {
                            if (undefined !== node.services[serviceName].performance_data[perfName]) {
                                funneler({
                                    'funnel': 'nagios',
                                    'nodeName': from,
                                    'serviceName': serviceName,
                                    'metricName': perfName,
                                    'reading': node.services[serviceName].performance_data[perfName]
                                });
                            }
                        });
                    }
                }

            });
        })
    }
};
