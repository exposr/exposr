# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.10.0](https://github.com/exposr/exposr/compare/v0.9.0...v0.10.0) (2024-02-11)


### Bug Fixes

* auto create named tunnels during connect ([17e48bd](https://github.com/exposr/exposr/commit/17e48bd00e9811b0c8286a35a3facc45520260e5))

## [0.9.0](https://github.com/exposr/exposr/compare/v0.8.0...v0.9.0) (2023-09-02)


### ⚠ BREAKING CHANGES

* this is not compatible with older exposrd servers.

### Features

* switch to ws-multiplex for websocket multiplexing ([9f70415](https://github.com/exposr/exposr/commit/9f70415ad95744ea36fa5ac2b4d0e8c3c74e4515))


### Bug Fixes

* do not abort connection attempts ([08045e5](https://github.com/exposr/exposr/commit/08045e5a7ab072898a72e92e502b79c4f0e7a506))

## [0.8.0](https://github.com/exposr/exposr-cli/compare/v0.7.2...v0.8.0) (2023-04-30)


### Features

* add client multi-connect support ([bd06ae1](https://github.com/exposr/exposr-cli/commit/bd06ae11c742e33cf95e75e99a5eebc05046c4b5))
* display connection status in info command ([2f727a0](https://github.com/exposr/exposr-cli/commit/2f727a059ed139e5399f2f1bbbca47489e0b243c))

### [0.7.2](https://github.com/exposr/exposr-cli/compare/v0.7.1...v0.7.2) (2023-04-22)


### Features

* list more tunnel details ([c504f68](https://github.com/exposr/exposr-cli/commit/c504f68270b3ffb358cd28282c999cf8d924761e))


### Bug Fixes

* throw error instead of returning ([d292424](https://github.com/exposr/exposr-cli/commit/d29242499851cdf4ad1955c4c389b3fcabc135b9))

### [0.7.1](https://github.com/exposr/exposr-cli/compare/v0.7.0...v0.7.1) (2022-03-08)


### Bug Fixes

* don't render app until there is data to display ([4f1e7b6](https://github.com/exposr/exposr-cli/commit/4f1e7b6b421e626cf594bd9316101936684d7fb9))
* reading version from package.json ([0d4ce11](https://github.com/exposr/exposr-cli/commit/0d4ce1191637a0b2735bca82c09d5d342428187a))
* require one of tunnel-id or target-url for connect command ([3ee9fee](https://github.com/exposr/exposr-cli/commit/3ee9feef2a4af89697148297534c4d5b273c352e))

## [0.7.0](https://github.com/exposr/exposr-cli/compare/v0.6.0...v0.7.0) (2022-03-05)


### Bug Fixes

* **build:** check for existance of build.env file before sourcing ([5c92b94](https://github.com/exposr/exposr-cli/commit/5c92b94f2ee2c2aff05d4d55f9d53853fa2b7f54))
* **build:** ignore build.js ([83b5cef](https://github.com/exposr/exposr-cli/commit/83b5cef27de387a18fb49d376c7ea23eeb7b523e))
* don't re-assign to constant ([dd5e142](https://github.com/exposr/exposr-cli/commit/dd5e1424bb36c5efb4227813d6fcb594e7c6a700))

## [0.6.0](https://github.com/exposr/exposr-cli/compare/v0.5.0...v0.6.0) (2022-03-01)


### ⚠ BREAKING CHANGES

* rename upstream to target

### Features

* add --non-interactive flag to disable interactive console ([e487abf](https://github.com/exposr/exposr-cli/commit/e487abf264ff9c3012c161befa61601fb11231c0))
* don't require target url for the tunnel connect command ([3856600](https://github.com/exposr/exposr-cli/commit/385660051bb5da0e70960e2bc6ee5f98805f03e0))
* print account number in log message on account creation ([2dd402e](https://github.com/exposr/exposr-cli/commit/2dd402e4989f6f0d61081ba2e1d3ac9942dd22d1))
* take optional configuration options for the tunnel create command ([28c87c8](https://github.com/exposr/exposr-cli/commit/28c87c8c5703533cdcc96c74b28519499828aef9))


* rename upstream to target ([1bea06d](https://github.com/exposr/exposr-cli/commit/1bea06d65b5974ebfbd45524e3a0c93d465084c0))

## [0.5.0](https://github.com/exposr/exposr-cli/compare/v0.4.0...v0.5.0) (2022-02-27)


### ⚠ BREAKING CHANGES

* implement a new fancy console 💄
* new command structure

### Features

* implement a new fancy console 💄 ([3128a64](https://github.com/exposr/exposr-cli/commit/3128a64307ed5463b172b1fdc08f9de8d94cd363))
* implement unset sub-command to tunnel configure ([50f64b4](https://github.com/exposr/exposr-cli/commit/50f64b4388a87b8edd57922f0f6a0e5fdce00f50))


### Bug Fixes

* logger in http-transformer ([2018719](https://github.com/exposr/exposr-cli/commit/201871972b87bf6b821fe719a867da90e5e20346))
* only print tunnel id if there is one ([9ff4c65](https://github.com/exposr/exposr-cli/commit/9ff4c6573ad97c83c8ff71e1af639a4fd8576f67))
* wrong url passed to tunnel connector ([aaf3ee1](https://github.com/exposr/exposr-cli/commit/aaf3ee18e6ef160aba4e93a8f8e5671d56e4b048))


* new command structure ([01ea4fb](https://github.com/exposr/exposr-cli/commit/01ea4fb0e0db582fd15fdf6946538d7eae88232a))

## [0.4.0](https://github.com/exposr/exposr-cli/compare/v0.3.0...v0.4.0) (2021-08-18)


### Features

* add support for HTTP ingress altnames (BYOD) ([50f4b37](https://github.com/exposr/exposr-cli/commit/50f4b373cce43414f609fdf53e55f61ed41ba093))

## [0.3.0](https://github.com/exposr/exposr-cli/compare/v0.2.2...v0.3.0) (2021-08-14)


### Features

* add support for SNI ingress ([860a8e0](https://github.com/exposr/exposr-cli/commit/860a8e0866074dd436bad9aef14ff342fd8567f4))

### [0.2.2](https://github.com/exposr/exposr-cli/compare/v0.2.1...v0.2.2) (2021-08-13)


### Bug Fixes

* **http-transformer:** header rewriting when on different ports ([592056e](https://github.com/exposr/exposr-cli/commit/592056e77fedabdaa6af772195f847df464cbb83))

### [0.2.1](https://github.com/exposr/exposr-cli/compare/v0.2.0...v0.2.1) (2021-08-02)


### Bug Fixes

* always run configure before connect tunnel ([f69d325](https://github.com/exposr/exposr-cli/commit/f69d32528f8573d7a8b8f62d52179043e2f4d54c))
* request http ingress by default ([0dc0e59](https://github.com/exposr/exposr-cli/commit/0dc0e59ea5106dcfbfd94c6afdbbae07a39c142a))

## [0.2.0](https://github.com/exposr/exposr-cli/compare/v0.1.0...v0.2.0) (2021-07-23)


### Features

* add configure-tunnel command ([a7c2d89](https://github.com/exposr/exposr-cli/commit/a7c2d8937b4530a8f8351bc106e49c3401ad4ba2))
* support configuration of SSH tunnel transport ([65b6253](https://github.com/exposr/exposr-cli/commit/65b6253ffc70d37a498f49b619f30ed4627187f4))

## 0.1.0 (2021-06-28)


### Features

* allow options to be passed as environment variables ([9534fec](https://github.com/exposr/exposr-cli/commit/9534fec6d15fd705004345e09e309172d2767f82))
* custom user agent ([0b49ae6](https://github.com/exposr/exposr-cli/commit/0b49ae60a222d7b91c73c9975cdfd747772221da))
* display package/build version ([3290302](https://github.com/exposr/exposr-cli/commit/3290302a35f1cb27cf41f98f31b19abad263315b))


### Bug Fixes

* **ws-transport:** performance improvements ([e449bd3](https://github.com/exposr/exposr-cli/commit/e449bd3e7117e57b7878be971131e07c0ebbcba9))
