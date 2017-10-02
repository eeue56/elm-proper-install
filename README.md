# elm-proper-install

This is more or less a project in a state of disrepair. It was originally started as a way to allow for installation of private packages, but was no longer needed. I recommend checking out https://github.com/NoRedInk/elm-ops-tooling/blob/master/native_package_install.py instead

:fire: :fire: :fire: Properly install things from Github for Elm. This is _only_ intended for when you can't use elm-package. :fire: 
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
