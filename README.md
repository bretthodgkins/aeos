# Aeos

Aeos is an open-source AI automation platform that harnesses the power of Large Language Models (LLMs) to build and run complex automations.

It's designed to be highly extendible, by allowing users to create their own automations, and provide examples of them being called using natural language.

It also supports a robust plugin system which adds capabilities such as computer vision, OCR, image recognition, browser automation, GUI automation, as well as, integrations with many popular applications including Google Sheets, Google Drive, Notion, Slack, Hubspot, Trello, Monday.com, AWS and many more.

## Key Features:

* Highly extendible AI agent for complex task automation
* Utilises GPT-4 for task creation and execution using natural language
* Advanced capabilities like computer vision, OCR, image recognition
* Integration with popular platforms via plugin system
* Flow control support for conditions, loops, exception handling, etc.
* Desktop support for Mac OSX, Windows, Linux
* Command-line support for headless automations
* Ability to schedule and monitor an army of AI agents via Notion

## Installation

You can easily install Aeos globally with npm:

```bash
npm install -g aeos
```

## Usage

Here's a simple guide on how to use Aeos:

```bash
# To list all commands
aeos commands

# To run specific commands
aeos run <commands...>

# To list all plugins
aeos plugins

# To install a specific plugin
aeos install <plugin>

# To update a specific plugin
aeos update <plugin>

# To remove a specific plugin
aeos remove <plugin>
```

The above commands are basic ways to use Aeos. For more advanced usage, please refer to the full documentation.

## Contributing

Contributions to the Aeos project are welcome! Whether it's reporting bugs, discussing improvements and new ideas, or direct contributions via pull requests, we appreciate your help.

See the [CONTRIBUTING.md](CONTRIBUTING.md) file for more details.

## License

Aeos is an open-source software provided under the [MIT License](LICENSE).