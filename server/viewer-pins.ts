/** Pins CDN — versión sincronizada en build desde package.json. */



export const SWAGGER_VIEWER_PKG = "@jeff-aporta/is-swagger";

export const SWAGGER_VIEWER_VERSION = "0.1.18";

/** Pin jsDelivr (repo GitHub, carpeta cdn/). */

export const SWAGGER_VIEWER_GH_REPO = "Jeff-Aporta/swagger-viewer";

/** Alias histórico (versión npm / CDN pin). */

export const SWAGGER_VIEWER_REF = SWAGGER_VIEWER_VERSION;

/** Alias histórico (nombre del paquete npm). */

export const SWAGGER_VIEWER_REPO = SWAGGER_VIEWER_PKG;

export const SWAGGER_FRONT_SHARED_REF = "13629aa";



/** Base URL CDN del visor en jsDelivr (sin barra final). */

export function swaggerViewerCdnJsdelivr(ref = SWAGGER_VIEWER_VERSION) {

    const pin = String(ref || SWAGGER_VIEWER_VERSION).replace(/^v/, "");

    return `https://cdn.jsdelivr.net/gh/${SWAGGER_VIEWER_GH_REPO}@${pin}/cdn`;

}



/** Base URL CDN del visor en npm/jsDelivr (paquete publicado). */

export function swaggerViewerCdnNpm(ref = SWAGGER_VIEWER_VERSION) {

    const pin = String(ref || SWAGGER_VIEWER_VERSION);

    return `https://cdn.jsdelivr.net/npm/${SWAGGER_VIEWER_PKG}@${pin}/cdn`;

}

