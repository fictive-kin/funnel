var shared = require('./shared');

module.exports = function (service) {
    var sys = require('sys')
    var exec = require('child_process').exec;
    var hostname = require('os').hostname().split('.')[0];
    return function (funneler) {
        var from = service.from;
        // cast to array
        if (typeof from == 'string') {
            from = [from];
        }
        from.forEach(function (cmd) {
            for (var sName in service.services) {
                (function (serviceName) { // yum! delicious scope!
                    exec(cmd, function (error, stdout, stderr) {
                        if (error) {
                            console.log("Error.")
                            console.log("stdout:")
                            console.log(stdout)
                            console.log("stderr:")
                            console.log(stderr)
                            return false;
                        }
                        funneler({
                            'funnel': 'command',
                            'nodeName': hostname,
                            'serviceName': sName,
                            'metricName': cmd,
                            'reading': service.services[sName](stdout),
                        });
                    });
                })(sName);
            }
        });
    }
};

