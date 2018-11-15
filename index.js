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
      bodyParser = require('body-parser');
const ZonesDB = require('./lib/zones_db');
let zones_db = new ZonesDB();


const PORT = 3000;

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 


app.get('/', function (req, res) {
  res.send('Hello World!');
})

// POST /domains << {name:'mydomen.com', ip_address: '192.168.1.69'}
app.post('/domains', function (req, res) {
    zones_db.add_zone(req.body.name, req.body.ip_address, request_result.bind(this,res));
})

// DELETE /domains/:name
app.delete('/domains/:name', function (req, res) {
    zones_db.del_zone(req.params.name, request_result.bind(this,res));
})


/**
 * POST /domains/$DOMAIN_NAME/records << {type,alias,ttl,data}
 * type=A,AAAA; data=IP; [ttl=1800]
 * type=CNAME; alias=www; [ttl=1800]
 */
app.post('/domains/:name/records', function (req, res) {
    zones_db.make_record(req.params.name, req.body.type, req.body, request_result.bind(this,res));
})


app.listen(PORT, function () {
  console.log('Example app listening on port ' + PORT);
});

function request_result(res, error, data){
    let result;
    if (error)
        result = {error: error.message || error};
    else
        result = {result: "ok", data: data||''};
        
    res.send(JSON.stringify(result));
}
