# kc-ui

Minimal React skeleton for the art commission site.

## Setup

1. Install dependencies:

```bash
npm install
```

2. If the API is not running on `http://localhost:8000`, set the frontend API origin before starting:

```bash
export REACT_APP_API_BASE_URL=http://localhost:8000
```

3. Start the development server:

```bash
npm start
```

4. Open `http://localhost:3000`.

## Notes

- This UI currently uses `react-scripts`, not Vite yet.
- The frontend expects camelCase DTOs from `kc-api`.
- For the full app to work locally, the API should already have its schema loaded from `kc-api/sql/001_startup.sql` and should be started with a populated `.env`.
