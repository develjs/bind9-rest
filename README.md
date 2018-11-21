## 1. install bind9

    sudo apt-get install bind9
    # and stop immediately
    sudo service bind9 stop 

## 2. make zone file

    /etc/bind/zones/named.conf
    

and include it to main zones config

    # /etc/bind/named.conf
    ...
    include "/etc/bind/zones/named.conf";


## 3. init and params about bind9 (bind-config.json)
    
    npm run init

## 4. start rect server
    
    npm start

