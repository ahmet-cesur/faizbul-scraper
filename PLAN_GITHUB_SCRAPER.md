# Architecture Migration Plan: GitHub Actions -> Google Sheets -> Android App

## Objective
Migrate from client-side scraping (Android WebView) to server-side scraping (GitHub Actions) to improve reliability and performance.

## Workflow
1.  **Scraping (GitHub Actions)**:
    *   **Repository**: [faizbul-scraper](https://github.com/ahmet-cesur/faizbul-scraper)
    *   A scheduled GitHub Action (cron job) runs a scraper script (likely Node.js/Puppeteer or Python).
    *   The script scrapes interest rate data from bank websites (Garanti, Ziraat, Akbank, etc.).
    *   *Note*: The existing JavaScript logic in `ScraperSpec.kt` can be adapted for this.

2.  **Storage (Google Sheets)**:
    *   The scraper writes the structured data to a specific Google Sheet.
    *   This sheet acts as the backend database.
    *   **Target Sheet**: [Interest Rates Sheet](https://docs.google.com/spreadsheets/d/1tGaTKRLbt7cGdCYzZSR4_S_gQOwIJvifW8Mi5W8DvMY/edit?pli=1&gid=0#gid=0)

3.  **Consumption (Android App)**:
    *   The Android app fetches the data from the Google Sheet.
    *   Method: Public CSV export link (spreadsheets.google.com/tq?...) or Google Sheets API.
    *   App parses and displays the rates locally.

## Next Steps
1.  Get the Google Sheet URL from the user.
2.  Set up the GitHub repository and Actions workflow.
3.  Port the extraction logic from `ScraperSpec.kt` to a standalone script.
4.  Update the Android app to fetch from the Sheet instead of running WebViews.
