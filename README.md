# Aeos

Aeos is an open-source AI automation platform that harnesses the power of Large Language Models (LLMs) to build and run complex automations.

It's designed to be highly extendible, by allowing users to create their own automations, and provide examples of them being called using natural language.

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
npm install -g bhodgk/aeos
```

Alternatively, you may prefer to use Aeos Desktop (supports Mac OS, Windows and Linux) or Aeos In Notion (schedule + monitor many agents)

<br>

## Usage

Here's a simple guide on how to use Aeos CLI:

```bash
# List all commands
aeos commands

# Run specific commands OR use natural language
aeos run <commands...>

# List all plugins
aeos plugins

# Install a plugin
aeos install <plugin>

# Uninstall a plugin
aeos uninstall <plugin>
```

The above commands are basic ways to use Aeos. For more advanced usage, please refer to the full documentation.

<br>

## Contributing

Contributions to the Aeos project are welcome! Whether it's reporting bugs, discussing improvements and new ideas, or direct contributions via pull requests, we appreciate your help.

See the [CONTRIBUTING.md](CONTRIBUTING.md) file for more details.

<br>

## License

Aeos is an open-source software provided under the [MIT License](LICENSE).