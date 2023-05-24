# Aeos

Aeos is an open-source AI automation platform that harnesses the power of Large Language Models (LLMs) to build and run complex automations.

It's designed to be highly extendible, allowing users to create their own automations, and provide examples of them being called using natural language.

It also supports a robust plugin system which adds capabilities such as computer vision, OCR, image recognition, browser automation, GUI automation, as well as, integrations with many popular applications including Google Sheets, Google Drive, Notion, Slack, Hubspot, AWS and many more.

<br>

## Key Features:

* Highly extendible AI agent for complex task automation using natural language
* Advanced capabilities like computer vision, OCR, image recognition, manipulating spreadsheets, parsing large documents via plugins
* Integration with popular applictions via plugins
* Flow controls such as conditions, loops, nested commands, exception handling, etc.
* Desktop support for Mac OSX, Windows, Linux (see Aeos Desktop)
* Schedule and monitor an army of agents via Notion (see Aeos In Notion)
* Command-line interface for headless support

<br>

## Official Plugins:

* Browser Automation
  * Chromium
* Desktop Automation
  * Mouse movement - Move, click, drag
  * Keyboard input - Press (and hold), type
  * Copy & paste - Access your system clipboard
  * Window info - Retrieve info about open windows
* Google Drive
* Notion
* PDF
* XLSX

<br>

## Installation

This repo provides a Command-Line Interface which can be easily installed globally with npm:

```bash
npm install -g @bhodgk/aeos
```

You will also need to set the following environmnet variables:
* OPENAI_ORG_ID: An OpenAI Organisation token
* OPENAI_API_KEY: An OpenAI API key


Alternatively, you may prefer to use Aeos Desktop (supports Mac OS, Windows and Linux) or Aeos In Notion (schedule + monitor many agents)

<br>

## Quick Start

Here's a simple guide on how to use Aeos CLI:

```bash
# List all commands
aeos commands

# Run specific commands OR describe what you want in natural language, and it will map to valid commands
aeos run <commands...>

# Install a plugin (npm package name or local directory)
aeos install <plugin>

# List all plugins
aeos plugins

# See manual for detailed documentation
aeos help
```

<br>

## Develop your own plugins

Creating a new plugin is easy! Simply clone and modify the [Aeos Plugin Template](https://github.com/bretthodgkins/aeos-plugin-template).

```bash
git clone git@github.com:bretthodgkins/aeos-plugin-template.git
cd aeos-plugin-template
npm install
npm run build
```

You can install this working directory as an Aeos plugin whilst in development:

```bash
aeos install .
```

After that, you can start adding functionality to your plugin.

<br>

## Publishing Your Plugin

Aeos supports the installation of plugins directly from npm, which simplifies the publishing and distribution process. Follow these steps to publish your plugin:

1. Ensure that you have an npm account and that you're logged into npm in your development environment. If you haven't, you can create an account on the [npm website](https://www.npmjs.com/).

2. In your plugin directory, make sure your `package.json` file is properly set up. Particularly, verify that the `name`, `version`, and `main` properties are correctly defined.

3. Once your `package.json` file is ready and your code is finalised, you can publish your plugin to npm using the `npm publish` command:

```bash
npm publish
```

4. After publishing, your plugin will be available in the npm registry and can be installed by anyone using the following Aeos command:

```bash
aeos install <your-package-name>
```

<br>


## Contributing

Contributions to Aeos are welcome! Whether it's reporting bugs, discussing improvements and new ideas, or direct contributions via pull requests, we appreciate your help.

See the [CONTRIBUTING.md](CONTRIBUTING.md) file for more details.

<br>

## License

Aeos is an open-source software provided under the [MIT License](LICENSE).