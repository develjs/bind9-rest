# next command init current host IP
# set here dns server IP address (ex. 192.168.1.69)
ip_address="$(ifconfig | sed -En 's/127.0.0.1//;s/.*inet (addr:)?(([0-9]*\.){3}[0-9]*).*/\2/p')"
ip_port=3000
domain="c.com"
echo "Used ip_address = ${ip_address}"
echo ""

# nslookup a.com $ip_address
# nslookup b.com $ip_address
# nslookup c.com $ip_address
# nslookup d.com $ip_address
echo "--- Register domain: ${domain} ${ip_address} ---" 
curl -X POST "http://${ip_address}:${ip_port}/domains" -H "content-type:application/json" --data "{\"name\":\"${domain}\", \"ip_address\": \"${ip_address}\"}" 
echo ""
echo ""

echo "--- Check domain: ${domain} ---"
nslookup ${domain} $ip_address
echo ""

echo "--- add 'www' alias for domain: ${domain} ---"
curl -X POST "http://${ip_address}:${ip_port}/domains/${domain}/records" -H "content-type:application/json" --data "{\"type\":\"CNAME\", \"name\":\"www\", \"data\":\"${domain}\"}"
echo ""

echo "--- Check alias: www.${domain} ---"
nslookup www.${domain} $ip_address
echo ""

echo "--- Remove domain: ${domain} ---"
curl -X DELETE "http://${ip_address}:${ip_port}/domains/${domain}" -H 'content-type:application/json'
echo ""
echo ""

echo "--- Check domain: ${domain} ---"
nslookup ${domain} $ip_address


