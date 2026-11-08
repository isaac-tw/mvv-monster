# MVV Monster

A real-time departure tracking application for Munich's public transportation system (MVV - Münchner Verkehrs- und Tarifverbund).

**🚀 [https://mvv.monster/](https://mvv.monster/)**

## Features

- 📍 **Multi-Station Tracking** - Monitor departures from multiple stations simultaneously
- 🚇 **Real-Time Updates** - Automatic refresh
- ⏱️ **Delay Indicators** - Clear visualization
- 💾 **Configuration Import/Export** - Transfer saved stops, selected lines, and ordering between browsers or devices

## Importing and exporting your configuration

Select **Import / Export** above the departure board, then **Export configuration** to download `mvv-monster-config.json`.

To restore it, choose the JSON file in the same dialog, review the listed stops, and select **Replace configuration**. Import replaces your current saved stops; export them first if you want a backup. An empty configuration clears all stops. Invalid files leave your current configuration unchanged. Files may contain up to three stops and must be smaller than 1 MB.

Configuration files use a versioned JSON envelope (`format: "mvv-monster"`, `version: 1`, `savedSelections`). They include saved stop details, line filters, and station/group order. Transfer the downloaded file yourself; import/export runs in your browser.

## API Integration

This application uses an **unofficial MVV API** created through reverse engineering with AI assistance. The API provides:
- Station search functionality
- Real-time departure times
- Planned vs. actual departure times
- Line information and directions

### ⚠️ Disclaimer

**This project is not affiliated with, endorsed by, or connected to MVV (Münchner Verkehrs- und Tarifverbund) or MVG (Münchner Verkehrsgesellschaft).** 

- The API used is **unofficial** and created through reverse engineering
- The service may break or become unavailable if MVV changes their systems
- Use at your own risk - this is a hobby project for personal and educational purposes
- For official MVV information, please visit [mvv-muenchen.de](https://www.mvv-muenchen.de/)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

---

Made with ❤️ in Munich
