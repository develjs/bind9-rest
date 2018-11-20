## install bind9
    sudo apt-get install bind9
    # and stop immediately
    sudo service bind9 stop 

# make zone file
/etc/bind/zones/named.conf

# and include to to main zones config

        # /etc/bind/named.conf
        ...
        include "/etc/bind/zones/named.conf";

# init and params about bind9 (bind-config.json)
npm run init

## start rect server
npm start

