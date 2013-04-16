var version = require('../version')
module.exports = {
    fromJsonUrl: function (url, callback) {
        var parsed = require('url').parse(url);
        switch (parsed.protocol) {
            case 'http:':
                var protmod = require('http');
                break;
            case 'https:':
                var protmod = require('https');
                break;

            default:
                throw "Unsupported protocol in " + url;
        }
        parsed['user-agent'] = 'Funnel/' + version + ' node.js/' + process.version
        protmod.get(parsed, function(res) {
            var body = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.on('end', function() {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    throw "Invalid JSON returned from " + url;
                }
                callback(body, parsed);
            });
        });
    },
    dbiSolo: function (result) {
        if (result && result[0]) {
            return result[0][Object.keys(result[0])[0]];
        }
    },
    ALL: '__funnel.ALL__',
    COUNT: '__funnel.COUNT__',
    nocb: function(){}
}



