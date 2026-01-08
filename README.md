# Box Packing "Cartonization" Service MVP

A production-quality standalone service for optimizing box packing (cartonization) with a built-in test UI and ShipStation integration.

## Features
- **Algorithms**: First-Fit Decreasing (FFD) and Best-Fit Decreasing (Score-based).
- **Core Logic**: Support for item rotation, padding, max weight, and various dimensional weight divisors.
- **UI**: "Packing Lab" for testing scenarios, managing boxes, and comparing algorithms.
- **Integration**: ShipStation API support (Store list, Create Order).

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
Copy the env template:
```bash
cp .env.example .env
```
Edit `.env` and add your ShipStation API Key/Secret if you want real integration.

### 3. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

### 4. Testing
Run the test suite:
```bash
npm test
```

## Usage Guide
1. **Manage Boxes**: Go to the "Boxes" tab to add your standard box sizes.
2. **Pack**: Go to "Scenarios", add items, and click "PACK NOW".
3. **Compare**: Use the "Compare" tab to run FFD vs BestFit against the current item set.
4. **ShipStation**: Once a pack is successful, you can push the result to ShipStation as a new order.

## Deployment (Vercel)
1.  **Install Vercel CLI**: `npm install -g vercel`
2.  **Deploy**: Run `vercel` in the project root.
3.  **Environment Variables**:
    *   **Vercel does NOT read your local `.env` file.**
    *   You must go to the **Vercel Dashboard** > **Settings** > **Environment Variables**.
    *   Add the following keys:
        *   `SHIPSTATION_API_KEY`: (Your Key)
        *   `SHIPSTATION_API_SECRET`: (Your Secret)
        *   `SHIPSTATION_API_URL`: `https://api.shipstation.com/v2`

    *   *Alternatively*, using CLI:
        ```bash
        vercel env add SHIPSTATION_API_KEY
        # paste value when prompted
        ```

## API Endpoints
- `POST /api/pack`: Core packing endpoint.
- `GET /api/boxes`: List boxes.
- `POST /api/shipstation/upsert-order`: Create order in ShipStation.

## Project Structure
- `src/packing`: Core packing logic (FFD, BestFit, Fit Checks).
- `src/storage`: In-memory data repositories.
- `src/shipstation`: ShipStation client.
- `src/ui`: Frontend source code.
