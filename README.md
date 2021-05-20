# exposr

exposr is a self-hosted tunnel server that allows you to securely expose devices and services
behind NATs or firewalls to the Internet through public URLs.

exposr can for example be used for development and previews or for exposing services behind NAT/firewalls
to the Internet without port-forwarding and risk of exposing your IP address.

exposr-cli is the client that allows you to interact with an exposr server such as creating/deleting and establishing tunnels.

Note that you need a self-hosted server component running to be able to use the client.
For the server component, see [exposr-server](https://github.com/fredriklindberg/exposr-server).

# Quick start

Exposing localhost port 3000 using server at `exposr.example.com`

    docker run --rm -ti exposr/exposr:unstable -s https://exposr.example.com tunnel http://host.docker.internal:3000

To expose/proxy a host different than localhost 

    docker run --rm -ti exposr/exposr:unstable -s https://exposr.example.com tunnel https://example.net