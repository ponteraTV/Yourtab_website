# Yourtab_website

## Local object storage

Start MinIO with `docker compose up -d minio`, then use the values in
`.env.example` when running the API. MinIO's console is available at
`http://localhost:9001` (default credentials: `minioadmin` / `minioadmin`).

`POST /v1/uploads/presign` accepts `{ "key", "contentType", "expiresIn?", "metadata?" }`
and returns a short-lived PUT URL, the headers the client must send, and its expiry.
The API deliberately returns a URL rather than proxying file bytes through the API.
