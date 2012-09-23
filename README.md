Funnel
======

An easy way to pull metrics from various sources, and transport them into [StatsD](https://github.com/etsy/statsd).


Sources
-------

The following is a list of currently supported sources (via plugin); examples of their usage can be found further below:

* [Amazon CloudWatch](http://aws.amazon.com/cloudwatch/)
* Any database supported by [Node-DBI](https://github.com/DrBenton/Node-DBI)
* [JSON](http://json.org/) over HTTP(s)
* [MongoDB](http://www.mongodb.org/)
* [Munin](http://munin-monitoring.org/) (Note: you don't need to actually run Munin's graphing/monitoring system; your nodes just need the Munin client)
* [Nagios]() (with [nagios-api](https://github.com/xb95/nagios-api); you must be running a version that includes [our patch](https://github.com/xb95/nagios-api/pull/10) for it to be useful in Funnel)

Support for additional sources is [always welcome](https://github.com/fictivekin/funnel/pulls).


Why
---

At [Fictive Kin](http://fictivekin.com/), we use [StatsD](https://github.com/etsy/statsd) and [Graphite](http://graphite.wikidot.com/) to [measure everything](http://codeascraft.etsy.com/2011/02/15/measure-anything-measure-everything/) (for small values of *everything*).

Our apps send *pushed metrics* (such as "a user grabbed a new image with [Gimme Bar](https://gimmebar.com/)") to StatsD in the code, but we also needed a system that could fetch *pulled metrics* (such as "the Gimme Bar load balancer's current average latency"). Enter Funnel.

Funnel makes it easy to pull all of those measurements in one common framework, and handles transportation to StatsD.


Usage and Examples
------------------

Funnel was designed to be easy to use and maintain. Here's a very simple example that uses the `json` plugin to fetch the current USD to CAD conversion rate, and simply display it (the data is not actually sent to StatsD in this example):

    var funnel = require('../funnel/funnel');

    funnel.collect(
      funnel.json({
        services: {
          'usdcad': 'rates.CAD'
        },
        from: 'http://openexchangerates.org/api/latest.json'
      })
    ).display();

To send the data to StatsD, you'd simply change the call to `display()` to `toStatsD(host, port)` (and `port` is optional):

    funnel.collect(
      /* same as before */
    ).toStatsD('statsd.example.com');

The `collect()` method takes any number of parameters, so you can queue them up:

    var cad = funnel.json({
      services: {'usdcad': 'rates.CAD'},
      from: 'http://openexchangerates.org/api/latest.json'
    });

    var eur = funnel.json({
      services: {'usdeur': 'rates.EUR'},
      from: 'http://openexchangerates.org/api/latest.json'
    });

    funnel.collect(cad, eur).display();

The above code actually fetches `latest.json` twice. If you'd like to optimize this, you can collect multiple `services` for each `from` sources:

    var currency = funnel.json({
      services: {
        'usdcad': 'rates.CAD'
        'usdeur': 'rates.EUR'
      },
      from: 'http://openexchangerates.org/api/latest.json'
    });
    funnel.collect(currency).display();

That's the gist of how Funnel works. Next, we'll cover the specific fetcher plugins. To make the code more clear, assume the following structure for these examples:


    var funnel = require('../funnel/funnel');

    var source = EXAMPLE_GOES_HERE;

    funnel.collect(source).display();


### cloudwatch ###

Fetch data from Amazon's CloudWatch API. This is useful for correlating AWS-specific metrics with code metrics (think average load balancer latency vs. API method call volume).

    source = funnel.cloudwatch({
      services: {
        'load-balancer-bar-requests': { // metric name
          namespace: 'AWS/ELB', // CloudWatch-specific data
          metric: 'RequestCount',
          name: 'LoadBalancerName',
          value: 'load-balancer',
          unit: 'Count',
          type: 'Sum',
        }
        // more services can be collected from the same `from`, here
      }
      from: {
        id: AWS_ID,
        secret: AWS_SECRET
      }
    });

The CloudWatch data is very specific to how CloudWatch (and the AWS API) returns data. A little bit more information can be found in this [aws-lib](https://github.com/livelycode/aws-lib) [example](https://github.com/livelycode/aws-lib/blob/master/examples/cw.js).

### dbi ###

Query and fetch data from any database supported by [Node-DBI](https://github.com/DrBenton/Node-DBI).

    source = funnel.dbi({
      services: {
        'example-active-users': {
          query: "SELECT COUNT(user_id) FROM api_last_visited WHERE activity > NOW() - INTERVAL '1 minute'",
          callback: funnel.dbiSolo
        },
      }.
      from: {
        host: 'db.example.com',
        user: 'username',
        password: 'password',
        database: 'database_name',
        adapter: 'pg' // postgres
      }
    });

This plugin uses a callback method to fetch data. Notice the `funnel.dbiSolo` call above. This is a simple helper method that fetches the first column from the first row of the resultset, but sometimes a more robust callback is necessary. Sometimes you might even want to fetch multiple metrics from the same query. Here's an example of how to do that:

    source = funnel.dbi({
      'content-type.%': {
        query: 'SELECT content_type AS name, COUNT(content_type) AS num FROM content GROUP BY content_type',
        callback: function (result) {
          var ret = {};
          result.forEach(function (row) {
            ret[row['name']] = row['num'];
          });
          return ret;
        }
      },
      from: example_db_params
    });

This callback returns an object containing keys and values. Note also that the metric name contains a `%`. For each pair returned from the callback, a metric is generated for the key (which replaces `%` in the metric name), and the reading is the pair's value. The query is only run once, however.


### json ###

This plugin is covered in some detail above, but here's a simple example:

    source = funnel.json({
      services: {
        'usdcad': 'rates.CAD',
        'usdeyr': 'rates.EUR'
      },
      from: 'http://openexchangerates.org/api/latest.json'
    });


### mongodb ###

Collect data from MongoDB.

    source = funnel.mongo({
      services: {
        'users': funnel.COUNT,
        'assets': funnel.COUNT,
        'pro_users': {
          'collection': 'users',
          'query': {'type': 'pro'}
        }
      },
      from: 'mongodb://db.example.com/databasename'
    });

This example is pretty straightforward. This collects counts for the `users` and `assets` MongoDB collections (note the special funnel helper `funnel.COUNT`). For the `pro_users` metrics, a query and collection are supplied. The `from` is a [MongoDB connection URL](http://www.mongodb.org/display/DOCS/Connections).

### munin ###

Collect data from nodes that are running a Munin (plugin) client.

    source = funnel.munin({
      services: {
        'uptime': funnel.ALL,
        'cpu': ['user', 'idle', 'steal']
      },
      from: 'server.example.com'
    });

The helper `funnel.ALL` collects all plugin/returned data under this heading.


### nagios ###

Most of the data available to Nagios is queryable via Munin, but since we're already running Nagios (and collecting this data as part of our general systems monitoring strategy), it's useful to collect some data directly from Nagios.

    source = funnel.nagios({
      source: 'http://nagios.example.com:64001/state',
      services: {
        'MongoDB queues': ['readers_queues','writers_queues'],
        'MongoDB Connect Check': funnel.ALL
      },
      from: ['db1.example.com', 'db2.example.com']
    });

You'll notice that `funnel.ALL` is used here, too. This collects all performance data under this heading. `from` can be an array (or a string for a single server, but you *are* running MongoDB in a replica set, right? (-: ).



