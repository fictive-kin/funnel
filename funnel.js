var shared = require('./plugin/shared');

var collect = function (sourcesdotdotdot) {

    var fetchers = [];

    // arguments is not a real array; no forEach
    var len = arguments.length;
    for (var i=0; i<len; i++) {
        fetchers.push(arguments[i]);
    }

    var fixMetricName = function (name, preserveDot) {
        var re = preserveDot ? /[^a-z0-9._-]/ig : /[^a-z0-9_-]/ig;
        return name.replace(re, '-').replace(/-+/g, '-').toLowerCase();
    };

    var asMetricName = function (data, preserveDot) {
        var name = ['funnel'];
        name.push(data.funnel);
        name.push(fixMetricName(data.nodeName));
        if (data.serviceName) {
            name.push(fixMetricName(data.serviceName));
        }
        name.push(fixMetricName(data.metricName, preserveDot));
        return name.join('.');
    };

    var display = function () {
        fetchers.forEach(function (fetcher) {
            fetcher(function (data) {
                console.log(asMetricName(data, data.preserveMetricNameDot), data.reading);
            });
        });
    };

    var toStatsD = function (host, port) {
        port = port || 8125;
        var SDC = require('statsd-client'),
            sdc = new SDC({host: host, port: port, debug: true});
        fetchers.forEach(function (fetcher) {
            fetcher(function (data) {
                sdc.gauge(asMetricName(data, data.preserveMetricNameDot), data.reading)
            });
        });
    };

    return {
        toStatsD: toStatsD,
        display: display
    };
};

module.exports = {
    collect: collect,
    nagios: require('./plugin/nagios'),
    mongo: require('./plugin/mongo'),
    munin: require('./plugin/munin'),
    json: require('./plugin/json'),
    cloudwatch: require('./plugin/cloudwatch'),
    dbi: require('./plugin/dbi'),

    COUNT: shared.COUNT,
    ALL: shared.ALL,
    dbiSolo: shared.dbiSolo
}

