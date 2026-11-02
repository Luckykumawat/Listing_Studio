# Meesho Listing Studio

Private listing-workbook generator. Upload your original Excel template, map five fields, customize a title and account ID, filter local images to one mobile model, upload them to Cloudinary, and download a real XLSX workbook.

## Run locally

Node 22.13+ is required.

```sh
npm install
cp .env.example .env
# Fill the Cloudinary values in .env. Never commit it.
npm run dev
npm test
npm run build
```

This project uses React, TypeScript and the Next-compatible Vinext framework for deployment to Sites/Cloudflare Workers. ExcelJS handles XLSX processing in the browser; the template never goes to the server. The server receives individual product images, validates content, and signs Cloudinary uploads. Legacy XLS conversion uses SheetJS only after an explicit loss-of-fidelity confirmation.

## Image hosting setup

1. Create a Cloudinary account and open its API keys dashboard.
2. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET as runtime environment variables. Mark the key and secret as secrets in hosted settings. For local use put them in the ignored .env file.
3. Redeploy after changing hosted environment variables. Settings shows whether the three values are present. Presence does not prove the credentials are valid; actual uploads report provider errors.
4. Test a real image and retrieve its public URL. Uploads use signed requests, content-hash public IDs and overwrite=false so retrying does not create another copy. The server checks public HEAD retrieval and image content type.
5. Submit a small test workbook through Meesho’s supported seller workflow. No supported Meesho URL-acceptance API has been verified; the app never claims Meesho acceptance.

Cloudinary is the implemented provider, isolated in app/api/upload/route.ts. Replacing that route with an adapter returning `{url,publicVerified,meeshoVerified}` changes the provider without changing workbook logic. An S3/R2 adapter is not currently implemented.

## Provider comparison (checked November 2, 2026)

- Cloudinary: free plan has 25 credits covering storage, bandwidth and transformations. Chosen for signed uploads and direct HTTPS CDN URLs without separate CDN setup. Application limit is 10 MB/image; provider/account limits can be lower. Quotas and over-limit policies depend on the plan; monitor billing and upgrade before exhaustion. The app reports failed uploads and stops workbook generation for missing URLs. See https://cloudinary.com/pricing and https://cloudinary.com/documentation/billing_and_plans .
- Cloudflare R2 (S3-compatible): Standard free tier includes 10 GB-month, 1 million Class A and 10 million Class B operations; extra storage $0.015/GB-month with operation charges and free direct egress. Requires a public delivery domain and an upload adapter. See https://developers.cloudflare.com/r2/pricing/ .

These are provider prices, separate from app hosting. Public product images consume storage/bandwidth. Do not delete hosted images while listings depend on them. Resetting a batch does not delete public uploads.

## Workflow

1. Optionally load a seller profile. Profiles are stored only in this browser's localStorage and contain no storage secrets or Meesho credentials.
2. Upload XLSX (preferred) or accept the warning for XLS conversion. Choose the worksheet, header and first product row. Header detection is a heuristic and must be checked.
3. Map title, dropdown, image URL, Product ID and SKU ID independently. The original script's D/X/AF/AJ/AK are initial suggestions only. Verify every header. Reused profiles with changed headers block generation until reviewed and saved again.
4. Configure title, account text, counter, fallback, optional clear columns and fixed values. Same ID is written to Product ID and SKU ID.
5. Add JPG/JPEG/PNG images. Names may use `model_1.jpg` or `model_pexels-…_resized.jpg`. Marker is configurable. Malformed filenames are rejected. Filter a multi-model file selection down to one model. The displayed model is editable.
6. Upload selected images. Successful URLs survive changes to workbook settings in the current tab. Retry skips successful images. Cancel stops after the current image.
7. Preview and download. Existing content blocks output unless overwrite is explicitly selected. Merged output cells are rejected. Generation clones the uploaded workbook and changes only configured fields.

## Tests

`npm test`: filename extensions, parsing and mixed models; batches of 1/49/100/200/500; IDs; invalid inputs; two dynamic column maps; 200-row XLSX round trips; original sheets, formulas, column widths, styles and dropdown validation; overwrite/merge protection.

No live Cloudinary upload test has run without owner credentials. No real seller template or sample product images were provided. Synthetic workbook fixtures are used for automated integrity checks. Complete a real-template acceptance check before using a large batch.

## Limits and security

- Owner-private hosted Site access protects the application. Preserve private access. Local dev must bind to loopback. Public/multi-user hosting needs explicit identity checks, durable per-user limits and server-owned profile persistence before exposure.
- Upload route validates image magic bytes and a 10 MB limit, restricts upstream hosts, never accepts arbitrary retrieval URLs, and does not write temporary files. Cloudinary secrets remain server-side.
- Excel processing occurs on the user's device. Not all advanced workbook features are preserved by ExcelJS. Charts, pivots, external connections, signatures, embedded objects, complex validations and metadata may change. The app warns before processing. Keep the original and inspect the output.
- XLS conversion may lose formatting and validation. Use XLSX for fidelity.
- List dropdowns support quoted lists, named range references and ordinary ranges. Unsupported formulas fail safely. Non-list validations are retained but not interpreted. A missing model-list validation uses the model as plain text.
- No Meesho login, scraping, CAPTCHA handling or private API use. No Google Sheets in-place update: this version creates a downloadable workbook.
- No account-wide duplicate-ID check or automatically verified Meesho title limit. Excel's 32,767-character limit is enforced; users must check current seller-template rules.
- Batch count is dynamic; practical browser memory is the limit. Template input is capped at 15 MB and visible column options at 300. Uploads are sequential with per-file progress; no byte-level progress is shown.
- Profiles and upload URLs are not synchronized across browsers. URLs remain in tab memory until reload; no persistent upload history/database is implemented.

## Source structure

- app/page.tsx: guided UI, previews, mapping, browser-local profiles
- app/api/upload/route.ts: signed uploads and public retrieval checks
- app/api/storage/route.ts: credential-presence status (no secret values)
- lib/listing.mjs: parsing, ID/title generation, filename sanitizing
- lib/workbook.mjs: safe mapped workbook population
- tests/: automated core and XLSX integrity tests
- .env.example: credential variable names only

For hosted deployment, use the Sites workflow with .openai/hosting.json, set secrets with the native environment-variable tool, build, package and deploy privately. Ordinary Next.js hosting requires adapting the Vinext starter scripts to standard Next scripts; this is not a vanilla Next deployment.
