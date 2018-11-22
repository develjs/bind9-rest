/**
 * Create REST interface for zone DB requests  
 * POST /domains << {name:'mydomen.com', ip_address: '192.168.1.69'}  
 * DELETE /domains/:name
 * POST /domains/$DOMAIN_NAME/records << {type,alias,ttl,data}
 *      type=A,AAAA; data=IP; [ttl=1800]
 *      type=CNAME; alias=www; [ttl=1800]
 */
const express  = require('express'),
    bodyParser = require('body-parser');


module.exports = function(zones_db) {
    let router = express.Router();
    
    // to support JSON-encoded bodies
    router.use(bodyParser.json()); 
    router.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies
    
    router.post('/', function (req, res) {
        zones_db.add_zone(req.body.name, req.body.ip_address, request_result.bind(this,res));
    });
    
    router.delete('/:name', function (req, res) {
        zones_db.del_zone(req.params.name, request_result.bind(this,res));
    });

    router.post('/:name/records', function (req, res) {
        zones_db.make_record(req.params.name, req.body.type, req.body, request_result.bind(this,res));
    });
    
    return router;
};


function request_result(res, error, data){
    let result;
    if (error)
        result = {error: error.message || error};
    else
        result = {result: "ok", data: data||''};
    res.send(JSON.stringify(result));
}
