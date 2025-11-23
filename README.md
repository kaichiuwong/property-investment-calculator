# Property Investment Calculator

A React-based web application for analyzing Australian property investments. Features real-time cash flow analysis, rental yield estimations using Gemini AI, and 30-year financial projections.

## Features

*   **Comprehensive Inputs**: Calculate based on purchase price, loan terms, LVR, and detailed expenses.
*   **AI Integration**: Auto-estimate rental income for specific suburbs and property types using Gemini 2.5 Flash.
*   **Interactive Projections**: 30-year Wealth (Value vs Loan) and Cash Flow charts.
*   **Time Travel**: Slider to view financial breakdown at any point in the 30-year projection.
*   **Dark Mode**: Automatic system detection with manual toggle.
*   **Detailed Breakdown**: Weekly/Monthly/Yearly views for Income and Expenses.

## Development Setup

This project is built using React and TypeScript.

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  Clone the repository or download the source code.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

To run the application locally, you can use a development server like Vite.

1.  Initialize a new Vite project (if not already set up):
    ```bash
    npm create vite@latest my-app -- --template react-ts
    ```
2.  Move the provided `index.tsx` and `index.html` into the project (adjusting paths as necessary, e.g., move `index.tsx` to `src/main.tsx` or similar depending on Vite config).
3.  Start the development server:
    ```bash
    npm run dev
    ```

**Note**: The provided code uses CDN imports in `index.html` for a standalone environment. For a standard local development environment, you should install the packages via npm:

```bash
npm install react react-dom lucide-react recharts @google/genai
```

And remove the `<script type="importmap">` block from `index.html`.

## Deployment

### Deploying to Netlify/Vercel

1.  Push your code to a GitHub repository.
2.  Connect your repository to Vercel or Netlify.
3.  Set the `API_KEY` environment variable in the deployment settings for the Google Gemini API integration.
4.  The platform will automatically detect the React build settings (e.g., `vite build`).

### Environment Variables

*   `API_KEY`: Required for AI Rental Estimation and Investment Analysis features. Obtain one from [Google AI Studio](https://aistudio.google.com/).
