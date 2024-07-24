# KModels Client

KModels Client `kc` provides command line tool. To list available commands, either run with no parameters or execute `kc help`:

```
Usage: kc [options] [command]

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  model                     model commands
  splitter                  splitter commands
  ensemble                  ensemble commands
  remove [options] <id...>  remove one or more models
  predict [options] <id>    send predict request
  explain [options] <id>    send explain request
  describe <id>             return model information
  ready <id>                return model readiness
  retrain <id...>           retrain model
  restore <id> <build>      restore a model
  models                    list models
  sync                      sync models
  template                  template commands
  templates                 list templates
  project                   project commands
  feedback                  feedback commands
  config                    cli configuration
  version                   controller version
  help [command]            display help for command
```

## Install

Clone the parent repository and enter the cli folder
```
cd kmodels/cli
```

Install node modules
```
npm i
```

And tehn install globaly
```
npm i -g
```

## Uninstall

To uninstall `kc`, run the following command
```
npm uninstall -g kc
```

## Configuration

Configuration file is located in `~/.kc/config.json`
```
{
  "url": "http://localhost:6262"
}
```

You can override each parameter with environment variable.
Variable | Description | Config path
---|---|---
URL | Models server url <host>:<port> | config.url

or use the cli `config` options, e.g., set host url
```
kc config set --url http://localhost:3000
```

## Examples

To create an new model from template
```
kc model create iris:1.0.0
```

<img src="./docs/kmodels-cli-create-iris.gif"/>

For templates which require configuration, create `config.json`
```json
{
  "arguments": {
    "eta": "0.3"
  },
  "connector": [
    {
      "id": "sklearn",
      "schedule": "now",
      "arguments": {
        "dataset": "iris"
      }
    }
  ]
}
```

and send it to the model server
```
kc model create xgboost:1.0.0 -f config.json
```

## Run as Docker

KModels Client can run as a docker container. When running as a container, the KModels url host should be specify as enviornment parameter
```
docker run --rm -e URL="<KMODELS URL>" us.icr.io/ai4a/kc <COMMAND>
```

E.g., to connect to local host and list all templates
```
docker run --rm -e URL="http://host.docker.internal:6262" us.icr.io/ai4a/kc models
```

To create iris model from configuration file, map folder of config file (current foldet in this example) and run
```
docker run --rm -v $(pwd):/config -e URL="http://host.docker.internal:6262" us.icr.io/ai4a/kc model create iris:1.0.0 -f /config/config.json
```

# Troubleshooting

#### Write access failure

If an error occurs while trying to install
```
npm WARN checkPermissions Missing write access to /usr/local/lib/node_modules/cli
```
Remove the folder and try again (you might need sudo)
```
rm -rf /usr/local/lib/node_modules/cli
npm i -g
```
