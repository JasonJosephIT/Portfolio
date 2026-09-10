// admin/edit.js — compatibility shim for the retired ?edit=1 overlay.
//
// This module used to place uploads on the page by dragging them around and
// save pixel offsets against markup that no longer exists. Structured records
// replaced it, so the only thing left to do is send the owner to the editor
// that does write them, carrying which gallery page they came from.
//
// The generated pages no longer load this module — they inline the same
// redirect. It stays because a cached or bookmarked page might still ask for
// it, and landing in the content editor is a better answer than a script error.

// A detail route sits three directories below the site root, and the site root
// is not necessarily the domain root: `/Portfolio/art/pieces/x/index.html` must
// climb to `/Portfolio/admin/content/`, not to `/admin/content/`. Climbing
// relatively is the only way to reach the editor from either kind of hosting.
const DETAIL_ROUTE = /\/(art\/pieces|art\/projects|tech\/projects)\/[^/]+\/[^/]*$/;

const route = location.pathname.match(DETAIL_ROUTE);
const prefix = route === null ? "" : "../".repeat(3);
// A detail page's own filename is always "index.html", which names no gallery;
// the editor is told the section the route belongs to instead.
const page = route === null ? location.pathname.split("/").pop() || "index.html" : `${route[1].split("/")[0]}.html`;

const target = new URL(`${prefix}admin/content/`, location.href);
target.searchParams.set("page", page);
location.replace(target);
