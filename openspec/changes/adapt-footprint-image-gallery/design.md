## Context

See `proposal.md` for motivation. The current frontend models one footprint as metadata plus a Base64 detail image: the list loader calls `/api/information/list` and then performs one `/detail` request per visible record. The upgraded backend instead returns `imageCount` and the first public image as `coverImage` in each list record, while all images are exposed through dedicated add, list, batch-delete, thumbnail, and original-resource endpoints.

The page is a Vue 3 component whose list, create, edit, and delete behavior currently lives in `CityMemoryPanel.vue`. Existing uncommitted map and styling work must be preserved. Production uses a trusted environment and same-origin `/api` forwarding; authentication, cross-origin configuration, and backend changes are outside this frontend change.

The behavioral contract is defined by the `footprint-image-gallery` and `city-photo-memories` delta specs in this change.

## Goals / Non-Goals

**Goals:**

- Replace the Base64/detail fan-out with list-provided cover URLs and image counts.
- Isolate gallery browsing and image mutation state from the footprint list and metadata form.
- Make pagination, cross-page preview navigation, upload uncertainty, idempotent deletion, and empty-gallery recovery deterministic and unit-testable.
- Keep image-management operations available from both city and district views without enabling city-level footprint creation.
- Preserve keyboard focus, background scroll, and close-lock semantics throughout modal use.

**Non-Goals:**

- Adding authentication, authorization, signed URLs, or a configurable cross-origin API host.
- Reordering images, selecting a custom cover, uploading multiple files at once, or editing image binary content.
- Changing backend endpoints, persistence, image validation, or the 50-image limit.
- Adding a route or standalone page for the gallery.
- Repairing or displaying historical records that lack a valid administrative scope or `visited:YYYY-MM-DD` tag.

## Decisions

### 1. Split API DTOs from the footprint view model

`imageTypes.ts` will model the backend contract explicitly:

- a public image contains `imageId`, file metadata, dimensions, `thumbnailUrl`, and `originalUrl`;
- footprint metadata contains `imageCount` and nullable `coverImage`;
- gallery list results use the existing `PaginatedImages<T>` envelope;
- batch deletion exposes `requestedCount`, `deletedCount`, `ignoredImageIds`, and `remainingCount`.

`CityMemory` remains the card-facing view model but replaces `imageBase64` with `coverImage` and `imageCount`, plus a local cover-load-failure flag. The loader maps only valid records and returns list data directly, eliminating `/detail` calls.

This keeps transport fields visible at the API boundary while preventing the panel from depending on obsolete Base64 or GridFS identifiers. Reusing `ImageMetadata` for every response was considered, but it would blur footprint IDs and stable business `imageId` values and make accidental use of backend-internal identifiers more likely.

### 2. Extend the existing API client with narrow image operations

`imageApi.ts` will retain relative URLs and add three typed methods:

- `listImages({ informationId, page, size })` → `POST /api/information/image/list`;
- `addImage({ informationId, file })` → multipart `POST /api/information/image/add`;
- `deleteImages({ informationId, imageIds })` → `POST /api/information/image/delete` after client-side de-duplication.

The obsolete detail-image method and file support in metadata update will be removed. Creation still accepts exactly one file and location fields; update creates a form containing only `id` and editable metadata. All business responses continue through the shared `readResponse` decoder, while public thumbnail/original URLs are assigned directly to `<img>` or `window.open` rather than fetched through the JSON client.

A generalized endpoint builder was considered, but explicit methods better encode multipart versus JSON payloads and make endpoint contract tests easier to read.

### 3. Use a dedicated gallery state controller with request guards

A framework-light `createImageGalleryState` module will own gallery-specific state and transitions: current footprint, mode (`browse`, `preview`, or `manage`), page, total, records, selected IDs, active preview image, loading/error state, and a single mutation state (`uploading` or `deleting`). The Vue modal consumes these refs/actions and emits a single `changed` event after a confirmed mutation.

Each list request will carry a monotonically increasing request token. Only the latest token may replace gallery data, preventing late responses from a previous page or footprint from overwriting the current view. Opening another footprint resets page, selection, preview, and errors. Page changes and leaving management clear selected IDs.

Keeping all logic directly in `FootprintGalleryModal.vue` was considered, but the number of transitions and recovery paths would make component tests brittle. Putting gallery state into the existing memory-panel controller was also rejected because gallery pagination is independent from footprint pagination.

### 4. Keep `CityMemoryPanel.vue` as the integration owner

The panel will continue to own footprint list pagination, the create/edit form, whole-footprint deletion, and the currently opened footprint ID. It will render `coverImage.thumbnailUrl` or an explicit empty/failure placeholder, show `imageCount`, and open the gallery from any cover state. `FootprintGalleryModal.vue` will receive the footprint identity, title, count, and an image API dependency.

On a gallery `changed` event, the panel reloads footprint page 1. This intentionally follows the backend ordering by updated `uploadTime`: an image mutation can move the footprint, so patching only the current card would leave list ordering and pagination stale. The open modal independently refreshes its current gallery page and remains usable.

The metadata edit form will not render a file input. The create form retains one required JPEG/PNG file. Whole-footprint deletion gets a separate confirmation state showing title, image count, and irreversible wording; it will not reuse the gallery deletion confirmation.

### 5. Define deterministic gallery pagination and preview navigation

Gallery page size is a constant 12. The state controller derives the valid last page from `total`; after deletion it requests `min(currentPage, lastPage)`, with page 1 representing the empty gallery. Selection never spans pages.

Preview stores the active stable `imageId`, not only an array index. Previous/next first use adjacent records on the current page. Crossing a boundary loads the adjacent page, then selects its last or first record. Controls are disabled while that boundary request is pending, and a failed request preserves the current preview with a retryable error.

Preloading all 50 image records was considered, but server pagination is already part of the contract and on-demand boundary loading keeps UI state consistent with the requested 12-per-page behavior.

### 6. Treat upload and delete outcomes differently

Before upload, the frontend validates that exactly one file has MIME type `image/jpeg` or `image/png` and size at most 50 MiB. The file input `accept` attribute is only a picker hint; validation is repeated in the submit action. While uploading, the UI shows the filename and an indeterminate busy state, disables duplicate submission, and locks all modal close paths.

If upload fails with an ordinary parsed API error, the gallery stays in management mode and shows that error. If `fetch` rejects or the request outcome is otherwise unknown, the client does not retry automatically: it reloads gallery data and footprint page 1, then tells the user to inspect the refreshed list before retrying.

Delete confirmation submits unique selected `imageId` values. A successful response is successful even when `ignoredImageIds` is non-empty; the result message reports deleted and ignored counts. After refresh, the state clears selection and falls back to the nearest valid page. Deleting the last image preserves the footprint and keeps the empty gallery in management mode.

Optimistic mutation was considered, but rejected because upload time can reorder the parent list and idempotent deletion may ignore only some submitted IDs. Server-confirmed refreshes provide an authoritative view.

### 7. Make modal interaction and image failure local and recoverable

`FootprintGalleryModal.vue` will be teleported to `body`, use `role="dialog"`, `aria-modal="true"`, an accessible title, and scoped styling. Opening records the trigger element, locks document scrolling, and moves focus into the dialog. Tab/Shift+Tab cycle within the modal; closing restores scrolling and trigger focus. Close button, Escape, backdrop click, and view transitions that would dismiss the modal are disabled during upload/delete.

Thumbnail failures are recorded by `imageId` and render a fixed-size failure tile without removing the item. Original failures preserve preview controls and expose retry/back actions. Error flags reset when the corresponding URL is retried or gallery data is refreshed.

A native `<dialog>` was considered, but the existing application has no dialog abstraction and browser-specific focus/scroll behavior would still require custom handling. A teleported controlled modal gives predictable integration with the map layout.

### 8. Keep deployment URLs relative and cleanup isolated

The frontend will not prepend a host to backend-provided image paths and will continue sending business requests to relative `/api/...` endpoints. Local development relies on the existing Vite proxy; production must route the same origin's `/api` prefix to the backend through Nginx, Ingress, or a gateway.

Before feature implementation, repository hygiene will be handled as a separate commit boundary: add `node_modules/`, `dist/`, `.superpowers/`, and TypeScript/Vite temporary outputs to `.gitignore`, then remove only their Git index entries. Local files remain on disk and unrelated working-tree changes are not reset or staged with the cleanup.

## Risks / Trade-offs

- [The backend updates `uploadTime` after image mutation, moving a footprint away from the user's current list context] → Always refresh footprint page 1 and make the movement explicit in success feedback.
- [A network failure after upload may hide a server-side success] → Never auto-retry; refresh authoritative state and instruct the user to inspect it before retrying.
- [The gallery changes while a user is previewing or selecting images] → Use stable image IDs, clear page-local selections on navigation, accept idempotent delete results, and refresh after mutations.
- [50 MB files can keep the dialog busy for a long time] → Show filename plus indeterminate busy state, prevent duplicate actions, and lock dismissal until the request settles.
- [Permanent public URLs and no client authentication expose images to anyone who can reach the trusted deployment] → Document this as an accepted deployment constraint; adding access control requires a separate backend/frontend change.
- [Focus trapping and body scroll locking can leak if the component unmounts unexpectedly] → Centralize setup/cleanup in modal lifecycle hooks and verify cleanup in component tests.
- [Repository cleanup can accidentally stage or remove unrelated user work] → Operate on explicit generated paths, remove only cached index entries, verify `git status`, and commit cleanup separately before feature files.

## Migration Plan

1. In an isolated cleanup commit, update ignore rules and untrack generated dependencies, builds, visual mockups, and compiler/Vite temporary files without deleting local copies or staging unrelated work.
2. Implement and test transport types/API methods, then migrate the card loader away from detail/Base64 requests.
3. Add the gallery state controller and modal, integrate them into the panel, and complete component/state/API tests.
4. Deploy the frontend only after the upgraded backend and its historical-data migration are complete; confirm the production proxy routes both JSON endpoints and image resources under `/api`.
5. Run create, list, empty-footprint, add, batch-delete, whole-footprint delete, thumbnail, and original-image smoke tests in both city and district views.

Rollback requires restoring the prior frontend together with a backend version that still supports its single-image detail/Base64 contract. Rolling back only the frontend after historical data has migrated is not compatible. The repository-cleanup commit may remain because it does not affect runtime behavior.
