/** Pins CDN — ref git sincronizado en build. */

export const SWAGGER_VIEWER_GH_REPO = "Jeff-Aporta/swagger-viewer";

export const SWAGGER_VIEWER_REF = "17e5836";

export const SWAGGER_FRONT_SHARED_REF = "99fb049";

/** Base URL CDN del visor en jsDelivr (sin barra final). */
export function swaggerViewerCdnJsdelivr(ref = SWAGGER_VIEWER_REF) {
    const pin = String(ref || SWAGGER_VIEWER_REF).replace(/^v/, "");
    return `https://cdn.jsdelivr.net/gh/${SWAGGER_VIEWER_GH_REPO}@${pin}/cdn`;
}
