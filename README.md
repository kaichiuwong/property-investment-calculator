# Property Calculator

A React-based web application for analyzing Australian property investments. Features real-time cash flow analysis, rental yield estimations using Gemini AI, and 30-year financial projections.

## Features

*   **Comprehensive Inputs**: Calculate based on purchase price, loan terms, LVR, and detailed expenses.
*   **AI Integration**: Auto-estimate rental income for specific suburbs and property types using Gemini 2.5 Flash.
*   **Interactive Projections**: 30-year Wealth (Value vs Loan) and Cash Flow charts.
*   **Time Travel**: Slider to view financial breakdown at any point in the 30-year projection.
*   **Dark Mode**: Automatic system detection with manual toggle.
*   **Detailed Breakdown**: Weekly/Monthly/Yearly views for Income and Expenses.

## Development Setup

### Prerequisites

*   Node.js (v18 or higher)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

### Environment Variables

Create a `.env` file in the root directory:

```
API_KEY=your_google_gemini_api_key
```

## Deployment on Vercel

1.  Push the code to a GitHub repository.
2.  Import the project into Vercel.
3.  Vercel will automatically detect the Vite framework.
4.  Add your `API_KEY` in the Vercel **Settings > Environment Variables** section.
5.  Deploy.
