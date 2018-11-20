/**
 * Handle domain zones database
 * 
 */
'use strict';

const
    path = require('path'),
    fs = require('fs'),
    child_process = require('child_process');
    

const
    ZONE_REC   = 'zone "${domain}" { type master; file "${data_folder}/${domain}"; };\n',
    ZONE_START = 'zone "${domain}"', // start line for search

    DATA_HEAD  = '$TTL 1h\n' + 
                 '@   IN SOA   ${ns1}. ${root}. ( ${serial} 3600 600 86400 3600 ) ;(serial refresh retry expire min TTL)\n' + 
                 '    IN NS    ${ns1}.\n' + 
                 '    IN NS    ${ns2}.\n',
    REG_SERIAL = /SOA[^\(]+\(\s*(\S+)/m,
    
    DATA_TYPE_REC  = {
        A:      '${name}.  ${ttl}    IN A     ${data}\n', // name=provider.domain, data=192.168.1.69, ttl=1800
        AAAA:   '${name}.  ${ttl}    IN AAAA  ${data}\n', // name=provider.domain, data=..IPv6.., ttl=1800
        CNAME:  '${name}   ${ttl}    IN CNAME ${data}.\n' // name=www, data = www.provider.domain, ttl=1800
    };


class ZonesDB {
    
    constructor(params) {
        this.params = Object.assign({}, params);
        let necessary_params = 'domain,ns1,ns2,root,config_file,data_folder'.split(',');
        necessary_params.forEach(p => {
            if (!(p in this.params)) {
                throw new Error('Params ' + necessary_params.join(',') + ' are necessary ('+ p +')');
                return;
            }
        })
    }
    
    
    /**
     * Create new zone
     * @param {String} domain
     * @param {String} ip_address
     * @param {Function} cb_error - callback with error
     */
    add_zone(domain, ip_address, cb_error) {
        cb_error = cb_error|| function(){};
        
        this.create_data_file(domain, ip_address, 0, error => { // ttl
            if (error) {
                cb_error(error);
                return;
            }
            
            // write config
            fs.readFile(resolve(this.params.config_file), 'utf8', (error, data) => {
                if (error) {
                    console.warn(error.message||error)
                }
                data = data||'';
                
                if (this._findDomain(data, domain)>=0) {
                    cb_error(new Error("Such zone has been created already"));
                    return;
                }

                let params = Object.assign({}, this.params, { 
                    domain, 
                    data_folder: resolve(this.params.data_folder) 
                });
                data += subst(ZONE_REC, params);
                fs.writeFile(resolve(this.params.config_file), data, error => {
                    if (error) {
                        cb_error(error);
                        return;
                    }
                    setTimeout(()=>{
                        this.reload();
                        cb_error();
                        console.log('added domain', domain, ip_address);
                    },1)
                })
            })
        })
    }
    
    
    /**
     * Remove zone
     * @param {String} domain
     * @param {Function} cb_error - callback with error
     */
    del_zone(domain, cb_error) {
        cb_error = cb_error|| function(){};

        // write config
        fs.readFile(resolve(this.params.config_file), 'utf8', (error, data) => {
            if (error) {
                cb_error(error);
                return;
            }
            
            let start = this._findDomain(data, domain);
            if (start<0) {
                cb_error("Can't find domain " + domain);
                return;
            }
            
            data = data.substr(0, start) + data.substr(data.indexOf('\n', start)+1);
            
            fs.writeFile(resolve(this.params.config_file), data, error => {
                if (error) {
                    cb_error(error);
                    return;
                }
                console.log('deleted domain', domain);
                
                fs.unlink(resolve(this.params.data_folder + '/' + domain), error => {
                    if (error) console.warn('Warning: domain file is not deleted!');
                    
                    cb_error(this.reload());
                });
            });
        })
    }
    
    
    /**
     * Add or replace dns record  
     * const DATA_TYPE_REC['A']     = '${name}.  ${ttl}    IN A     ${data}\n';  // name=my.domain, data=192.168.1.69, ttl=1800  
     * const DATA_TYPE_REC['CNAME'] = '${name}   ${ttl}    IN CNAME ${data}.\n'; // name=www.my.domain, data = my.domain, ttl=1800  
     * params = {name, ttl, data, type}  
     * for A | AAAA record name=domain is default  
     * @param {String} domain
     * @param {String} type - support A,AAAA,CNAME
     * @param {Object} params
     * @param {String} params.name
     * @param {String} params.data
     * @param {Integer} params.ttl
     */
    make_record(domain, type, params, cb_error) {
        cb_error = cb_error ||function(){};
        if (!(type in DATA_TYPE_REC)) {
            cb_error(new Error('Unknown record type'));
            return;
        }
        if (['A','AAAA','CNAME'].indexOf(type)<0) {
            if (!params || !params.name || !params.data) {
                cb_error(new Error('Wrong params (name or data)'));
                return;
            }
        }
        let _this = this;
        
        params = Object.assign({ttl: ''}, params);
        
        let path = resolve(this.params.data_folder + '/' + domain);
        fs.readFile(path, 'utf8', (error, data) => {
            if (error) {
                cb_error(error);
                return;
            }
            
            // search and replace if exists
            let reg = new RegExp('^\\S*\\s+IN\\s+' + type + '\\s+.*$','gm');
            let match;
            while (match = reg.exec(data)) {
                switch (type) {
                    case 'A': 
                    case 'AAAA':
                        if (match[0].startsWith(domain)) { // it should be only 1
                            save(data, match);
                            return;
                        }
                    break;
                        if (match[0].startsWith(params.name)) {
                            save(data, match);
                            return;
                        }
                    case 'CNAME':
                    break;
                }
            }
            
            // if new record
            save(data);
        })
        
        function save(data, match) {
            let new_data = subst(DATA_TYPE_REC[type], Object.assign({}, _this.params, params));

            if (match) {
                data = data.substr(0,match.index) + new_data + data.substr(match.index + match[0].length + 1); // replace matched record
            }
            else {
                data += new_data;
            }
            
            // update serial 
            data = data.replace(REG_SERIAL, (m,p1)=>m.replace(p1, getDATE(p1)))
            
            fs.writeFile(path, data, error => {
                if (!error) _this.reload();
                cb_error(error);
            })
        }
    }
    
    
    // ----------------------------
    
    _findDomain(data, domain) {
        return data.indexOf(subst(ZONE_START, Object.assign({}, this.params, { domain })));
    }

    // write data file with A record
    create_data_file(domain, ip_address, ttl, cb_error) {
        cb_error = cb_error|| function(){};
        
        let params = Object.assign({}, this.params, {
            ttl: ttl||'',
            name: domain,
            data: ip_address,
            serial: getDATE(), // date in iso format 2018111908
            data_folder: resolve(this.params.data_folder)
        });
        let data = subst(DATA_HEAD + DATA_TYPE_REC['A'], params);
        fs.writeFile(resolve(this.params.data_folder + '/' + domain), data, error => {
            if (error) {
                cb_error(error);
                return;
            }
            cb_error();
        })
    }


    reload(){
        try {
            child_process.execSync('service bind9 reload');//command[, options]
        }
        catch(e) {
            console.error(e);
        }
    }
}


function subst(str, context) {
    for (var p in context) {
        str = str.split('${' + p + '}').join(context[p]);
    }
    return str;
}

function resolve(filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}

function getDATE(old_value) {
    let new_value = new Date().toISOString().replace(/\D/g,'').substr(0,10);
    if (parseInt(new_value) <= parseInt(old_value))
        new_value = parseInt(old_value) + 1;
    return new_value;
}

module.exports = ZonesDB;