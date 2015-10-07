Code Push
===

Dev Setup
---

* Install [Node.js](https://nodejs.org/)
* Install [Git](http://www.git-scm.com/)
* Install Gulp: `npm install -g gulp`
* Clone the Repository: `git clone https://github.com/Microsoft/code-push.git`

### Building

* Run `npm install` from the root of the repository.
* Run `gulp install` to install the NPM dependencies of each module within the project.
* Run `gulp link` to link CLI and SDK for local development. It is advisable to do this step if you are making changes to the SDK and want the CLI to pick those changes.
* Run `gulp build` to build all of the modules. To build just one of the modules (e.g. cli or sdk), run `gulp build-cli` or `gulp build-sdk`.

### Running Tests

To run all tests, run `gulp test` script from the root of the project.

To test just one of the projects (e.g. cli or sdk), run `gulp test-cli` or `gulp test-sdk`

### Coding Conventions

* Use double quotes for strings
* Use four space tabs
* Use `camelCase` for local variables and imported modules, `PascalCase` for types, and `dash-case` for file names
