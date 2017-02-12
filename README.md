# elm-proper-install
Properly install things from Github for Elm

## Install

```
npm install -g elm-proper-install
```

## Usage

```
noah@noah-Swanky ~/d/elm-proper-install> elm-proper-install -h
Options:
  -v, --verbose  Print all messages out                         [default: false]
  -h, --help     Show help                                             [boolean]

Examples:
  elm-proper-install                        Install elm-ffi
  https://github.com/eeue56/elm-ffi
  elm-proper-install                        Install all packages
```

### Install a new package

```
elm-proper-install eeue56/elm-ffi
elm-proper-install https://github.com/eeue56/elm-ffi
```

### Install all packages from elm-package.json

```
elm-proper-install
```