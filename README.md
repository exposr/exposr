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

    > docker run --rm -ti --add-host host.docker.internal:host-gateway exposr/exposr:latest -s https://exposr.example.com tunnel connect http://host.docker.internal:3000

Depending on your Docker installation, `--add-host host.docker.internal:host-gateway` may be required to inject a DNS entry
to point to the host machine.

To expose/proxy a host different than localhost

    > docker run --rm -ti exposr/exposr:latest -s https://exposr.example.com tunnel connect https://example.net

# Demo

![](https://exposr.github.io/docs/img/demo/exposr-demo-20220301.svg)

# Usage

## Account management
Accounts can be created on servers with public account creation enabled.

    > exposr -s https://exposr.example.com account create
    ✔ 2022-02-24 19:00:00 +0000 - Creating account...success
    ✨  Created account K3JE-3XNF-8RPM-N325

## Tunnel management
Tunnel management can be accessed under the command `exposr tunnel`

    Commands:
      exposr tunnel create [tunnel-id] [options..]                  Create a new tunnel
      exposr tunnel connect [tunnel-id] [target-url] [options..]    Establish tunnel using the WebSocket transport
      exposr tunnel configure <tunnel-id>                           Configure an existing tunnel
      exposr tunnel info <tunnel-id>                                Fetch tunnel information
      exposr tunnel disconnect <tunnel-id>                          Disconnect a tunnel
      exposr tunnel delete <tunnel-id>                              Delete an existing tunnel

    Options:
          --help     Show help
          --version  Show version number
      -s, --server   Tunnel server API endpoint                     [string] [required]
      -a, --account  Account ID                                     [string]

### Creating tunnels

Before a tunnel can be connected it needs to be created, tunnels can be created with the
`tunnel create` command. Prior to using the create command, an account must first be created.

    > exposr -s https://exposr.example.com -a K3JE-3XNF-8RPM-N325 tunnel create my-tunnel
    ✔ 2022-02-24 19:00:00 +0000 - Creating tunnel...success (my-tunnel)
    ✨  Created tunnel my-tunnel

If no tunnel name is given, a random name is allocated

    > exposr -s https://exposr.example.com -a K3JE-3XNF-8RPM-N325 tunnel create
    ✔ 2022-02-24 19:00:00 +0000 - Creating tunnel...success (light-cheetah-74)
    ✨  Created tunnel light-cheetah-74

### Connecting tunnels

The `tunnel connect` can be used to create a connection to a tunnel using the websocket transport.

Connect a previously created tunnel to the target `https://example.net`.

    > exposr -s https://exposr.example.com -a K3JE-3XNF-8RPM-N325 tunnel connect my-tunnel https://example.net
    ✔ 2022-02-24 19:00:00 +0000 - Setting target-url to 'https://example.net/'...done
    ✔ 2022-02-24 19:00:00 +0000 - Setting ingress-http to 'true'...done
    ✔ 2022-02-24 19:00:00 +0000 - Setting transport-ws to 'true'...done
    ✔ 2022-02-24 19:00:00 +0000 - Establishing tunnel...connected to https://example.net/
    ● 2022-02-24 19:00:00 +0000 - Ingress HTTP: http://my-tunnel.example.com/
    ✨  Tunnel my-tunnel connected to https://example.net

The target `https://example.net` is now available through the ingress `http://my-tunnel.example.com`.

The connect command can also be used to "quick connect" to a target, neither an account nor a tunnel name is required.

    > exposr -s https://exposr.example.com tunnel connect https://example.net
    ✔ 2022-02-24 19:00:00 +0000 - No account ID provided, creating account...success (VC3X-EXHJ-CW4M-TR4Y)
    ✔ 2022-02-24 19:00:00 +0000 - Creating tunnel...success (helpless-bat-97)
    ✔ 2022-02-24 19:00:00 +0000 - Setting target-url to 'https://example.net/'...done
    ✔ 2022-02-24 19:00:00 +0000 - Setting ingress-http to 'true'...done
    ✔ 2022-02-24 19:00:00 +0000 - Setting transport-ws to 'true'...done
    ✔ 2022-02-24 19:00:00 +0000 - Establishing tunnel...connected to https://example.net/
    ● 2022-02-24 19:00:00 +0000 - Ingress HTTP: http://helpless-bat-97.example.com/
    ✨  Tunnel helpless-bat-97 connected to https://example.net

## Administration 
exposr servers can be administrated using the `exposr admin` commands.