/**
 * 
 * named.conf: 
 *  zone "a.com" { type master; file "/etc/bind/zones/a.com"; };
 * 
 * a.com:
 *  $INCLUDE /etc/bind/zones/default.conf
 *  a.com.             IN A            192.168.1.69
 * 
 * 
 * default.conf
 * API like https://developers.digitalocean.com/documentation/v2/#domains
 * 
 */
const express = require('express'),
    params = require('./bind-config.json'),
    
    ZonesDB = require('./lib/zones_db'),
    bindRest = require('./lib/rest');

let zones_db = new ZonesDB(params);
const PORT = params.post || 3000;


var app = express();


app.get('/', function (req, res) {
    res.send('Hello World!');
})

app.use('/domains', bindRest(zones_db));


app.listen(PORT, function () {
  console.log('Example app listening on port ' + PORT);
});

