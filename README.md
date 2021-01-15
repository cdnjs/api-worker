<h1 align="center">
    <a href="https://cdnjs.com"><img src="https://raw.githubusercontent.com/cdnjs/brand/master/logo/standard/dark-512.png" width="175px" alt="< cdnjs >"></a>
</h1>

<h3 align="center">The #1 free and open source CDN built to make life easier for developers.</h3>

---

<p align="center">
 <a href="#contributing">
   <img src="https://img.shields.io/badge/Robots-only-red.svg?style=flat-square" alt="Robots only">
 </a>
 <a href="https://github.com/cdnjs/logs/blob/master/LICENSE">
  <img src="https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square" alt="MIT License">
 </a>
 <a href="https://cdnjs.discourse.group/">
  <img src="https://img.shields.io/discourse/https/cdnjs.discourse.group/status.svg?label=Community%20Discourse&style=flat-square" alt="Community">
 </a>
</p>

<p align="center">
 <a href="https://github.com/cdnjs/packages/blob/master/README.md#donate-and-support-us">
  <img src="https://img.shields.io/badge/GitHub-Sponsors-EA4AAA.svg?style=flat-square" alt="GitHub Sponsors">
 </a>
 <a href="https://opencollective.com/cdnjs">
  <img src="https://img.shields.io/badge/Open%20Collective-Support%20Us-3385FF.svg?style=flat-square" alt="Open Collective">
 </a>
 <a href="https://www.patreon.com/cdnjs">
  <img src="https://img.shields.io/badge/Patreon-Become%20a%20Patron-E95420.svg?style=flat-square" alt="Patreon">
 </a>
</p>

---

## Introduction

This is the code that powers metadata.speedcdnjs.com.
It's an internal API that is NOT meant to be used directly. See [API] instead.

The API is implemented as a Cloudflare Worker and uses several KS namespaces that are populated from the [cdnjs bot].

## Contributing

### Deployement

Deployement and testing is managed by Cloudflare for now.

## License

Each library hosted on cdnjs is released under its own license. This cdnjs repository is published under [MIT license](LICENSE).

[API]: https://cdnjs.com/api
[cdnjs bot]: https://github.com/cdnjs/tools
