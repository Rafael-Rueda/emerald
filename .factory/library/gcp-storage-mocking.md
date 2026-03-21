# GCP Storage Mocking locally

When running the Sardius API locally, the GCP Storage upload route (`/api/storage/upload`) will fail with `ENOENT` due to the missing `gcp-service-account.json` credentials file. 

To test upload workflows locally, you must either bypass the real route using MSW or use the mocked `StorageProvider` in your automated tests. Do not attempt to use the real GCP storage route during local UI interactions unless you have specifically configured real credentials.
