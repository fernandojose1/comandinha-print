# Comandinha Print

Print agent for [Comandinha](https://comandinha.app.br) — runs on the restaurant
PC, bridges the cloud backend (`api.comandinha.app.br`) to the local ESC/POS
thermal printer.

## How it works

1. Manager creates a "PC" in the Comandinha panel (Gestor > Impressoras)
2. Manager downloads this agent and runs on the PC
3. Manager pastes the pair code generated in the panel
4. Agent polls the backend every 2s for queued print jobs
5. For each job, agent opens TCP socket to the printer (192.168.x.x:9100) and
   writes the ESC/POS bytes
6. Agent acks the job (success/failure) back to the backend

## Run from source

    npm install
    npm start

## Build standalone binaries

    npm run build
    # Outputs bin/comandinha-print-{win.exe,macos,linux}

## Config

Config is stored at `~/.comandinha-print/config.json`:

```json
{
  "bearer": "...",
  "api_url": "https://api.comandinha.app.br"
}
```

For development, set `COMANDINHA_API_URL` to override (e.g.
`http://localhost:8000`).

## License

Internal use, all rights reserved.
