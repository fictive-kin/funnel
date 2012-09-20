var shared = require('./shared');

module.exports = function (service) {
    var pending = 0;

    var doCount = function (conn, from, funneler, collection) {
        conn.collection(collection, function (err, coll) {
            pending++;
            coll.count(function (err, count) {
                pending--;
                funneler({
                    'funnel': 'mongo',
                    'nodeName': from.replace(/^mongodb:\/\//, ''),
                    'serviceName': collection,
                    'metricName': 'count',
                    'reading': count
                });
                if (pending == 0) {
                    conn.close();
                }
            });
        });
    };

    var doQuery = function (conn, from, funneler, serviceName, collection, query) {
        conn.collection(collection, function (err, coll) {
            pending++;
            coll.count(query, function (err, count) {
                pending--;
                funneler({
                    'funnel': 'mongo',
                    'nodeName': from.replace(/^mongodb:\/\//, ''),
                    'serviceName': serviceName,
                    'metricName': 'query',
                    'reading': count
                });
                if (pending == 0) {
                    conn.close();
                }
            });
        });
    };

    return function(funneler) {
        if (typeof service.from == 'string') {
            service.from = [service.from];
        }
        var mongodb = require('mongodb');
        service.from.forEach(function (from) {
            mongodb.connect(from, function(err, conn) {

                for (var serviceName in service.services) {
                    var collectionName;
                    if (service.services[serviceName] === shared.COUNT) {
                        doCount(conn, from, funneler, serviceName);
                    } else {
                        doQuery(conn, from, funneler, serviceName, service.services[serviceName].collection, service.services[serviceName].query);
                    }
                }

            });

        });

    };
};

